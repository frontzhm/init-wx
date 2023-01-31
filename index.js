// @ts-nocheck
const isWx = navigator.userAgent.toLowerCase().includes('micromessenger');
/**
 * wx.invoke接口变成promise模式
 * @param {*} method 比如 'sendChatMessage'
 * @param {*} params 比如 {msgtype:"text",...}
 * @returns 返回promise,直接用await拿res res = useWxInvokeApi(.)
 */
function useWxInvokeApi(method, params) {
  return new Promise((resolve, reject) => {
    wx.invoke(method, params, (res) => {
      const isOk = res.err_msg === `${method}:ok`;
      isOk ? resolve(res) : reject(res);
    });
  });
}
/**
 * wx接口变成promise模式
 * @param {*} method 比如 'onMenuShareAppMessage'
 * @param {*} params 比如 {title:'',desc:''}
 * @returns 返回promise,直接用await拿res res = useWxApi(.)
 */
function useWxApi(method, params) {
  return new Promise((resolve, reject) => {
    wx[method]({
      ...params,
      success: (res) => {
        resolve(res);
      },
      error: (res) => {
        console.log(res);
        reject(res);
      },
    });
  });
}

/**
 *
 * @param {*} { appId, timestamp, nonceStr, signature,  jsApiList = [],debug=true,beta=true} 
 * @returns
 * @notes 
 * 1. jsApiList不能为空数组，不然会报错
 * 1. appId, timestamp, nonceStr, signature一般为后端接口返回
 * 1. beta默认为true，可以调用wx.invoke
 * 1. debug首次使用建议为true，方便及早发现问题
 * 1. 使用：
 *  - await wxConfigAndReady(..jsApiList:['onMenuShareAppMessage']);
 *  - wx.onMenuShareAppMessage(...)
 * 
 */
function wxConfigAndReady({
  appId,
  timestamp,
  nonceStr,
  signature,
  beta = true,
  debug = true,
  jsApiList = ['agentConfig'],
}) {
  if (!isWx) {
    console.log('不在微信环境里')
    return;
  }
  if (!appId) {
    throw new Error('缺乏参数appId')
  }
  return new Promise((resolve, reject) => {
    const params = {
      beta, // 必须这么写，否则wx.invoke调用形式的jsapi会有问题
      debug, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
      appId, // 必填，企业微信的corpID
      timestamp, // 必填，生成签名的时间戳
      nonceStr, // 必填，生成签名的随机串
      signature, // 必填，签名，见 附录-JS-SDK使用权限签名算法
      jsApiList, // 必填，需要使用的JS接口列表，凡是要调用的接口都需要传进来,
    };
    wx.config(params);
    wx.ready(() => {
      // config信息验证后会执行ready方法，所有接口调用都必须在config接口获得结果之后，config是一个客户端的异步操作，所以如果需要在页面加载时就调用相关接口，则须把相关接口放在ready函数中调用来确保正确执行。对于用户触发时才调用的接口，则可以直接调用，不需要放在ready函数中。
      resolve();
    });
    wx.error((res) => {
      console.log('config有问题啦', res)
      reject(res);
      // config信息验证失败会执行error函数，如签名过期导致验证失败，具体错误信息可以打开config的debug模式查看，也可以在返回的res参数中查看，对于SPA可以在这里更新签名。
    });
  });
}
/**
 * 
 * @param {*}  {timestamp, nonceStr, signature, corpid, agentid, jsApiList = ['selectExternalContact']}
 * @returns 
 * @notes 
 *  - jsApiList不能为空数组，不然会报错
 *  - timestamp、 nonceStr、 signature，一般为后端接口返回
 *  - corpid，企业微信的corpid，必须与当前登录的企业一致
 *  - agentid，企业微信的应用id （e.g. 1000247）
 */
function wxAgentConfig({
  timestamp,
  nonceStr,
  signature,
  corpid,
  agentid,
  jsApiList = ['selectExternalContact'],
}) {
  if (!corpid || !agentid) {
    throw new Error('缺少参数corpid或agentid');
  }
  return new Promise((resolve, reject) => {
    // agentConfig注入的是应用的身份与权限
    const params = {
      corpid, // 必填，企业微信的corpid，必须与当前登录的企业一致
      agentid, // 必填，企业微信的应用id （e.g. 1000247）
      timestamp, // 必填，生成签名的时间戳
      nonceStr, // 必填，生成签名的随机串
      signature, // 必填，签名，见附录-JS-SDK使用权限签名算法
      jsApiList, //必填，传入需要使用的接口名称
      success: (res) => {
        resolve(res);
      },
      fail: (res) => {
        if (res.errMsg.indexOf('function not exist') > -1) {
          alert('版本过低请升级');
          return;
        }
        console.log('agentConfig出错啦', res)
        reject(res);
      },
    };
    wx.agentConfig(params);
  });
}

/**
 * @params {
  link,
  title,
  desc,
  imgUrl = 'https://k12static.xdf.cn/wxbackend/banner/20210719/624963032474bbcb5eb9976b5a4ca4ca.png',
  }
 *  @执行后的页面 https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/news_wx.png
 *
 * */
export function w_sendChatMessage_news({
  link,
  title,
  desc,
  imgUrl = 'https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/news_wx.png',
}) {
  useWxInvokeApi('sendChatMessage', {
    msgtype: 'news', // 消息类型，必填
    enterChat: true, // 为true时表示发送完成之后顺便进入会话，默认为false，仅移动端3.1.10及以上版本支持该字段
    news: {
      link, // H5消息页面url 必填
      title, // H5消息标题
      desc, // H5消息摘要
      imgUrl,
    },
  });
}
/**
 * 
 * @param {*} url js的链接
 * @returns `promise` 加载成功会调用resolve
 */
function loadScript(url = 'https://res.wx.qq.com/open/js/jweixin-1.2.0.js') {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    // IE
    if (script.readyState) {
      script.onreadystatechange = function () {
        if (script.readyState === 'loaded' || script.readyState === 'complete') {
          script.onreadystatechange = null;
          resolve();
          return;
        }
        reject();
      };
      return;
    }
    // 其他浏览器
    script.onload = function () {
      resolve();
    };
    script.src = url;
    document.getElementsByTagName('head')[0].appendChild(script);
  });
};
/**
 * 初始化微信：动态加载微信脚本，自动化config/ready/error步骤
 * @param {*} { appId, timestamp, nonceStr, signature,  jsApiList = [],debug=true,beta=true} 
 * @param {*} jsScript默认是https://res.wx.qq.com/open/js/jweixin-1.2.0.js
 * @returns
 * @notes 
 * 1. jsApiList不能为空数组，不然会报错
 * 1. appId, timestamp, nonceStr, signature一般为后端接口返回
 * 1. beta默认为true，可以调用wx.invoke
 * 1. debug首次使用建议为true，方便及早发现问题
 * 1. 使用：
 *  - await initWx({..jsApiList:['onMenuShareAppMessage']});
 *  - wx.onMenuShareAppMessage(...)
 * 
 */
async function initWx({
  appId,
  timestamp,
  nonceStr,
  signature,
  debug = true,
  beta = true,
  jsApiList = ['agentConfig'],
}, jsScript = 'https://res.wx.qq.com/open/js/jweixin-1.2.0.js') {
  if (!isWx) {
    return;
  }
  await loadScript(jsScript);
  // await api() 从后端接口拿到appId, timestamp, nonceStr, signature
  await wxConfigAndReady({ appId, timestamp, nonceStr, signature, debug, beta, jsApiList })

};
export {
  initWx,
  isWx,
  loadScript,
  wxConfigAndReady,
  wxAgentConfig,
  useWxApi,
  useWxInvokeApi,
  w_sendChatMessage_news
}