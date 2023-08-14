class MemberItem {
  //  价格
  constructor(openId, price, type, uid, endTime, startTime) {
    this.endTime = endTime;
    this.startTime = startTime;
    this.openId = openId;
    this.price = price;
    this.type = type;
    this.uid = uid;
  }
}
module.exports = MemberItem;
