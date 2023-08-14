const { timeFormat, getStaus, addYear } = require("../unit/timeFormat");
const cloud = require("wx-server-sdk");
async function memberAdd(db, data) {
  let res = await db.collection("member").add({
    data,
  });
  return res;
}
async function orderAdd(db, data) {
  let res = await db.collection("orderList").add({
    data,
  });
  console.log("添加订单记录成功");
  return res;
}
class memberContoller {
  //  获取会员价格列表

  async getMemberlist(ctx, next) {
    console.log("开始查询", ctx);

    let res = await ctx.db.collection("goodsList").get();

    ctx.body = {
      success: true,
      message: "查询列表成功!",
      code: 200,
      data: res.data,
    };
  }
  // 获取订单列表
  async getOrderlist(ctx, next) {
    let res = await ctx.db.collection("orderList").get();

    ctx.body = {
      success: true,
      message: "查询订单列表成功",
      code: 200,
      data: res.data,
    };
  }
  // 获取是不是会员
  async getMemberInfo(ctx, next) {
    let res = await ctx.db
      .collection("member")
      .where({ openid: ctx.OPENID })
      .field({
        openid: false,
      })
      .get();
    let target = res.data[0] || null;

    if (target) {
      target = {
        ...target,
        ...getStaus(target.endTime),
      };
      ctx.body = target;
    } else {
      console.log("新用户注册");
      return (ctx.body = {
        success: true,
        message: "查询成功",

        code: 200,
        data: {
          msg2: "新用户注册",
          type: "普通会员",
          status: false,
          remainDay: 0,
        },
      });
    }
  }
  //  购买会员
  //  上线后 * 100
  async pay(ctx, next) {
    //
    let { text, price, priceType } = ctx.req.body;
    if (!text || !price || !priceType) {
      throw new TypeError("字段不完整");
    }
    console.log(text, price, priceType);
    const outTradeNo = "member_" + timeFormat(null, "yyyymmddhhMM") + Date.now();
    const res = await cloud.cloudPay.unifiedOrder({
      body: "xxx协会" + text, // 商品名称
      outTradeNo: outTradeNo, // 商户订单号
      spbillCreateIp: "127.0.0.1", // 这里填调用云函数的ip地址
      subMchId: "1xxx44xx96", // 子商户号
      totalFee: parseInt(price) * 100,
      envId: "xxxxxxxxxx", //云开发环境id
      functionName: "pay_cb",
    });
    res.orderNumber = outTradeNo;
    ctx.body = {
      success: true,
      message: "请求支付成功",
      code: 200,
      data: res,
    };
  }
  //  返回用户的订单号 用户uid
  async paySuccess(ctx, next) {
    //   获取用户是否存
    let body = ctx.req.body;
    let orderData = {
      ...body,
      time: new Date(),
      openid: ctx.OPENID,
    };
    //   支付成功存入订单列表
    await orderAdd(ctx.db, orderData);
    let { text, price, orderNumber, uid, code, name, sex, phone, adress, wechatNumber } = ctx.req.body;
    // 判断会员类型
    if (!text || !price || !orderNumber) {
      throw new TypeError("字段不完整");
    }

    let res = await ctx.db.collection("member").where({ openid: ctx.OPENID }).get();
    let target = res.data[0] || null;
    let status, result;

    if (target) {
      status = getStaus(target.endTime);
      console.log(status, "状态,续费");
      //   status = status.status;
    }

    if (status && status.status) {
      console.log("你已经是会员了");
      //
      //   target.endTime = addYear(target.endTime);
      result = await ctx.db
        .collection("member")
        .doc(target._id)
        .update({
          data: {
            endTime: addYear(target.endTime),
            orderNumber,
          },
        });
    } else {
      //   会员已过期 新注册

      let curTime = timeFormat(null, "yyyy-mm-dd");
      let data = {
        uid: uid,
        openid: ctx.OPENID,
        endTime: addYear(curTime),
        orderNumber: orderNumber,
        price: price,
        startTime: curTime,
        type: text,
        code,
        name,
        sex,
        phone,
        adress,
        wechatNumber,
      };
      if (!target) {
        console.log("新用户注册");
        result = await memberAdd(ctx.db, data);
      } else {
        console.log("老用户更新");
        result = await ctx.db.collection("member").doc(target._id).update({
          data,
        });
      }
    }

    ctx.body = {
      success: true,
      message: "购买成功!",
      code: 200,
      data: result,
    };
  }
  //  获取会员列表

  async getMember(ctx, next) {
    let res = await ctx.db
      .collection("member")
      .field({
        openid: false,
      })
      .get();

    ctx.body = {
      success: true,
      message: "查询会员列表成功",
      code: 200,
      data: res.data,
    };
  }
  //  更新会员信息 _id,code:false
  async updateMember(ctx, next) {
    let data = ctx.req.body;
    let id = data._id;
    delete data._id;
    let res = await ctx.db.collection("member").doc(id).update({
      data,
    });

    ctx.body = {
      success: true,
      message: "更新会员信息成功",
      code: 200,
      data: res,
    };
  }

  //  新增时长
  // 退款操作
  async refund(ctx, next) {
    let { orderNumber, _id } = ctx.req.body;
    // 查询订单信息
    let datas = {
      out_trade_no: orderNumber, //商户订单号
      nonce_str: "" + new Date().getTime(), //随机字符串，这里也是采用时间戳精确到毫秒，人家要我们传随机字符串，我们就这么给他一个吧
      sub_mch_id: "1xxx44xx96", //子商户号，也就是商户号啦，没区别的
    };

    const { totalFee } = await cloud.cloudPay.queryOrder({ ...datas });

    let data = {
      out_refund_no: orderNumber + "-refund", // 退款订单号
      out_trade_no: orderNumber, // 付款订单号
      nonce_str: "95154sqwe", // 随机字符串
      subMchId: "1xxx44xx96",
      refund_fee: totalFee,
      total_fee: totalFee,
    };
    //   开始退款
    const res = await cloud.cloudPay.refund({
      ...data,
    });
    if (res.returnCode != "FAIL") {
      //  执行记录

      let refundDate = {
        ...data,
        typeCode: "退款",
      };
      await orderAdd(ctx.db, refundDate);

      let res2 = await ctx.db.collection("member").doc(_id).remove();
      console.log(res2, "移除数据");

      ctx.body = {
        success: true,
        message: "申请退款成功!",
        code: 200,
        data: res,
      };
    } else {
      ctx.body = {
        success: false,
        message: res.returnMsg || "退款失败",
        code: 200,
        data: res,
      };
    }
  }
  //  导出excel

  async exportExcel(ctx, next) {
    const xlsx = require("node-xlsx");
    let jsonData = [];
    let data1 = [];
    const { total } = await ctx.db.collection("member").count();
    for (let i = 0; i < total; i++) {
      await ctx.db
        .collection("member")
        .skip(i)
        .limit(1)
        .get()
        .then((res) => {
          if (i != 0) {
            jsonData = jsonData.concat(res.data);
          } else {
            jsonData = res.data;
          }
        });
    }
    let header = ["uid", "姓名", "性别", "手机号码", "会员类型", "微信号", "地址", "会员开始时间", "过期时间", "支付价格", "订单号"];
    data1.push(header);
    for (let sample of jsonData) {
      let { uid, name, sex, phone, type, wechatNumber, adress, startTime, endTime, price, orderNumber } = sample;
      data1.push([uid, name, sex, phone, type, wechatNumber, adress, startTime, endTime, price, orderNumber]);
    }
    letasx = [{ filed: "uid", title: "uid" }, { filed: "name", title: "姓名" }, { filed: "sex" }, { filed: "phone", title: "性别" }, { filed: "type", title: "手机号码" }, { filed: "wechatNumber", title: "会员类型" }, { filed: "adress", title: "微信号" }, { filed: "startTime", title: "地址" }, { filed: "endTime", title: "过期时间" }, { filed: "price", title: "支付价格" }, { filed: "orderNumber", title: "订单号" }];
    //    daoc
    let sheetName = "member/" + new Date().getTime() + ".xlsx";
    const options = {
      "!cols": [
        { wpx: 100 }, //1-    uid,
        { wpx: 50 }, //2-    name,
        { wpx: 50 }, //3-    sex,
        { wpx: 100 }, //4-    phone,
        { wpx: 80 }, //5-    type,
        { wpx: 100 }, //6-    wechatNumber,
        { wpx: 250 }, //7    adress,
        { wpx: 100 }, //8-    startTime,
        { wpx: 80 }, //9-    endTime,
        { wpx: 80 }, //10-    price,
        { wpx: 300 }, //10-    price,
      ],
    };
    var buffer = await xlsx.build([{ name: "XX协会会员表", data: data1 }], options);
    await cloud.uploadFile({
      cloudPath: sheetName,
      fileContent: buffer, //excel二进制文件
    });
    ctx.body = {
      success: true,
      message: "处理文件成功!",
      code: 200,
      data: {
        url: sheetName,
      },
    };
  }
}
module.exports = { memberContoller: new memberContoller() };
