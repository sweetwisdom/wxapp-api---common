"use strict";

const Router = require("wx-koa").WxRoute;
const router = new Router();
const crypto = require("crypto");
const { userContoller } = require("./controller/user");
const { memberContoller } = require("./controller/member");
// 拦截登录
// router.all("/user/*", async (ctx, next) => {
//   const { token, expire } = ctx.request.headers;
//   if (token && expire > new Date().getTime()) {
//     const openid = ctx.OPENID;
//     const md5 = crypto
//       .createHash("md5")
//       .update(openid + expire)
//       .digest("hex");
//     if (md5 === token) {
//       // 把用户信息加到上下文中, 正常是通过token从redis，获取用户信息的。这里使用openid 直接查询数据库去得到
//       const res = await ctx.db.collection("user").where({ openid }).get();
//       let user = res.data[0];
//       ctx.user = user;
//       await next();
//       return;
//     }
//   }
//   ctx.body = { code: 1002, message: "当前用户未登录", success: false };
// });

// 用户登录, jwt鉴权 12小时
router.post("/wxApi/login", userContoller.login);

// 检查是否登录
router.all("/user/checkLogin", async (ctx, next) => {
  ctx.body = "已经登录";
});
// 会员管理
router.get("/member/getMemberlist", memberContoller.getMemberlist); // 获取会员列表
router.get("/member/getOrderlist", memberContoller.getOrderlist); // 获取订单列表
router.get("/member/getMemberInfo", memberContoller.getMemberInfo); // 获取会员详情
router.post("/member/pay", memberContoller.pay); // 支付
router.post("/member/paySuccess", memberContoller.paySuccess); // 支付成功
router.post("/member/refund", memberContoller.refund); // 退款
router.post("/member/getMember", memberContoller.getMember); // 获取会员
router.post("/member/updateMember", memberContoller.updateMember); // 更新会员
router.post("/member/exportExcel", memberContoller.exportExcel); // 导出会员列表excel

// 获取手机号
router.post("/user/getUserMobile", userContoller.getUserMobile);
router.get("/user/getinfo", userContoller.getInfo);
router.post("/user/gets", userContoller.getInfo);
router.post("/user/pay", userContoller.pay);
// 捕抓最后的路径，error handle 实际可以处理
router.all("/*", (ctx, next) => {
  // ctx.router available
  ctx.body = {
    headers: ctx.headers,
    header: ctx.header,
    requrl: ctx.request.url,
  };
});

module.exports = router;
