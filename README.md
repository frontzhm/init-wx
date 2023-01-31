# wx-api

每次使用微信(包括企微)相关接口，就觉得需要重新写一遍`config`、`ready`，巴拉巴拉，烦的嘞。

于是，简单封装个库，方便使用。

## 安装和使用方式

```shell
# yarn add wx-api
npm install wx-api
```

项目里使用

```js
import { initWx } from 'init-wx';

const fn = async()=>{
  // await api() 从后端接口拿到appId, timestamp, nonceStr, signature
  initWx({appId, timestamp, nonceStr, signature,  jsApiList = ['onMenuShareAppMessage']})
}
wx.onMenuShareAppMessage(/*...*/)

```

## 库的方法介绍

- initWx 简单粗暴进行微信初始化操作
- isWx 直接是true或者false
- loadScript 加载脚本接口
- wxConfigAndReady 就是wx.config/ready/error合体
- wxAgentConfig 需要agentConfig的话，传入config即可
- useWxApi 将wx的api变成Promise，useWxApi('onMenuShareAppMessage',{title:''})
- useWxInvokeApi 将wx.invoke的方法变成Promise，useWxInvokeApi('sendChatMessage',{..})

## 库各个方法的原理

[官网的步骤](https://developer.work.weixin.qq.com/document/path/90514)看着是很清楚的。

1. 引入 JS 文件（支持 https）：http://res.wx.qq.com/open/js/jweixin-1.2.0.js
1. 通过 config 接口注入权限验证配置
1. 通过 ready 接口处理成功验证
1. 通过 error 接口处理失败验证
1. （不需要不用看）相关接口，还需要通过 `agentConfig` 接口注入权限验证配置

但是使用每次略麻烦，各种嵌套啰嗦，所以合并上面的步骤，之后直接传参使用最方便。

### 1. 引入 JS 文件

script 脚本直接放在 html 那里是一种方式，但更好应该是在需要使用微信接口的时候加载，所以这边选择动态加载。

```js
await loadScript('https://res.wx.qq.com/open/js/jweixin-1.2.0.js');

/**
 *
 * @param {*} url js的链接
 * @returns `promise` 加载成功会调用resolve
 */
export function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    // IE
    if (script.readyState) {
      script.onreadystatechange = function () {
        if (
          script.readyState === 'loaded' ||
          script.readyState === 'complete'
        ) {
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
}
```

> 为支持微信插件（原企业号）功能，请引用此文件。原企业微信的 js 文件在微信插件不生效。jweixin-1.6.0 版本企业微信客户端暂不支持。

### 2. 通过 config 接口注入权限验证配置

主要是通过`wx.config`注入配置信息，确保在微信许可之下，注意这个 api 可以理解为同步的。

重点说下参数:

- debug，在开始调试时，建议为`true`，能最快发现问题。
- appId/timestamp/nonceStr/signature，基本是后端接口返回，不理解啥意思也不打紧
- jsApiList，**不能为空数组**，不然会报错。你所使用的接口，都需要往里扔下，比如分享接口
- beta，最好始终为`true`，这样才能调用`wx.invoke`

```js
wx.config({
    beta: true,// 必须这么写，否则wx.invoke调用形式的jsapi会有问题
    debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
    appId: '', // 必填，企业微信的corpID
    timestamp: , // 必填，生成签名的时间戳
    nonceStr: '', // 必填，生成签名的随机串
    signature: '',// 必填，签名，见 附录-JS-SDK使用权限签名算法
    jsApiList: [] // 必填，需要使用的JS接口列表，凡是要调用的接口都需要传进来
});
```

### 5. 通过 ready 和 error 接口处理成功验证和失败验证

`wx.config`可以理解为同步的，验证成功之后自动会调用`ready`，失败会自动调用`error`。
这里需要页面加载就使用的接口，需要在`ready`调用，用户触发的则不需要。
但为了方便起见（偷懒），这边直接都放在 ready 使用。

```js

await loadScript('https://res.wx.qq.com/open/js/jweixin-1.2.0.js');
await wxConfigAndReady({...,jsApiList = ['onMenuShareAppMessage']});
wx.onMenuShareAppMessage(...)


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
  debug = true,
  jsApiList = ['agentConfig'],
}) {
  return new Promise((resolve, reject) => {
    const params = {
      beta: true, // 必须这么写，否则wx.invoke调用形式的jsapi会有问题
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
      console.log('config有问题啦', res);
      reject(res);
      // config信息验证失败会执行error函数，如签名过期导致验证失败，具体错误信息可以打开config的debug模式查看，也可以在返回的res参数中查看，对于SPA可以在这里更新签名。
    });
  });
}
```

### （不需要不用看）相关接口，还需要通过 `agentConfig` 接口注入权限验证配置

```js

await loadScript('https://res.wx.qq.com/open/js/jweixin-1.2.0.js');
await wxConfigAndReady({...,jsApiList = ['agentConfig']});
await wxAgentConfig({...,jsApiList = ['sendChatMessage']})
wx.invoke('sendChatMessage',...)
// sendChatMessage接口文档特地说明，必须先成功调用agentConfig，否则调用时会报“no permission”错误。


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
```

## 合并：动态加载微信脚本、config/ready/error

更加简化下，合并：动态加载微信脚本、config/ready/error

```js
await initWx({appId,jsApiList = ['onMenuShareAppMessage'],/*...*/})
wx.onMenuShareAppMessage()

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
```

## wx 相关 api 的 promise 化

微信的接口基本都有 success 和 fail，但使用起来有时候蹩脚，这边封装通用 promise 化

```js
await loadScript('https://res.wx.qq.com/open/js/jweixin-1.2.0.js');
await wxConfigAndReady({...,jsApiList = ['onMenuShareAppMessage']});
const res = await useWxApi('onMenuShareAppMessage', {title:'',desc:''})
console.log(res)

/**
 * wx接口变成promise模式
 * @param {*} method 比如 'onMenuShareAppMessage'
 * @param {*} params 比如 {title:'',desc:''}
 * @returns 返回promise,直接用await拿res res = useWxApi(.)
 */
export function useWxApi(method, params) {
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
```

## wx 相关 invoke 这个 api 的 promise 化

wx.invoke 的调用跟其他接口不一样，这边单独封装

```js
await loadScript('https://res.wx.qq.com/open/js/jweixin-1.2.0.js');
await wxConfigAndReady({...,jsApiList = ['agentConfig']});
await wxAgentConfig({...,jsApiList = ['sendChatMessage']})
const res = await useWxInvokeApi('sendChatMessage',...)
console.log(res)

/**
 * wx.invoke接口变成promise模式
 * @param {*} method 比如 'sendChatMessage'
 * @param {*} params 比如 {msgtype:"text",...}
 * @returns 返回promise,直接用await拿res res = useWxInvokeApi(.)
 */
export function useWxInvokeApi(method, params) {
  return new Promise((resolve, reject) => {
    wx.invoke(method, params, (res) => {
      const isOk = res.err_msg === `${method}:ok`;
      isOk ? resolve(res) : reject(res);
    });
  });
}
```
