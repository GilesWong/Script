/*
  使用说明：定时获取XJTU一卡通余额，并通过软件推送
  “定时”指可以用Cron表达式指定你想运行的时间
  已在Surge和Quantmult X上测试通过，理论上也能在Shadowrocket, Stash, Loon上跑，请自行根据下方信息填写对应软件的配置文件
  需要先使用BoxJS来填写学号, 

==================================Surge 配置方法================================
[Script]
xjtuID = type=http-request,pattern=^http:\/\/org\.xjtu\.edu\.cn\/openplatform\/toon\/auth\/loginByPwd,requires-body=1,max-size=0,debug=1,script-path=https://raw.githubusercontent.com/GilesWong/Scripts/main/xjtuToken.js,script-update-interval=0
xjtuToken = type=http-response,pattern=^http:\/\/org\.xjtu\.edu\.cn\/openplatform\/toon\/auth\/loginByPwd,requires-body=1,max-size=0,debug=1,script-path=https://raw.githubusercontent.com/GilesWong/Scripts/main/xjtuToken.js,script-update-interval=0
xjtuCardBalance = type=cron,cronexp="0 7,11,17 * * *",debug=1,script-path=https://raw.githubusercontent.com/GilesWong/Scripts/main/xjtuCardBalance.js


//虽然移动交通大学到现在连登录都不愿意用HTTPS，还是明文传输用户名和密码，但是以防哪天突然想起来开HTTPS了，加一下吧
// 23.10.4 移动交通大学App已经开启HTTPS勒, 好事
[MITM]
hostname = *.xjtu.edu.cn

==================================Quantumult X 配置方法================================
[rewrite_local]
^https:\/\/org\.xjtu\.edu\.cn\/openplatform\/toon\/auth\/loginByPwd url script-response-body https://raw.githubusercontent.com/GilesWong/Scripts/main/xjtuToken.js

[task_local]
0 7,11,17 * * * https://raw.githubusercontent.com/GilesWong/Scripts/main/xjtuCardBalance.js, tag=XJTUCardBalance, enabled=true

[mitm]
hostname = *.xjtu.edu.cn
 */

const $ = new Env("xjtuCardBalance");
const xjtuToken = $.getval("xjtuToken")
const xjtuID = $.getval("@giles.xjtuCardBalance.XJTUID")
const push_enabled = $.getdata("@giles.xjtuCardBalance.push_enabled") || false
const warn_balance = $.getdata("@giles.xjtuCardBalance.warn_balance") || 20.0
const tgbotToken = $.getdata("@giles.xjtuCardBalance.tgbotToken") || ''
const tgbotChatid = $.getdata("@giles.xjtuCardBalance.tgbotChatid") || ''
const barkURL = $.getdata("@giles.xjtuCardBalance.bark") || ''

var code = '';

if (!xjtuToken) {
    $.msg("请先获取或填写XJTU_Token");
    $.done()
}

if (!xjtuID) {
    $.msg("请先填写XJTU ID");
    $.done()
}

const codeUrl = `http://org.xjtu.edu.cn/openplatform/toon/auth/getCode?personToken=` + xjtuToken;
const method = `GET`;
const headers = {
    'Connection': `keep-alive`,
    'Accept-Encoding': `gzip, deflate`,
    'toonType': `150`,
    'User-Agent': `TLauncher/6.2.3 (iPhone; iOS 15.0; Scale/2.00)`,
    'platform': `iOS`,
    'platformVersion': `16.1`,
    'secretKey': `18a9d512c03745a791d92630bc0888f6`,
    'Authorization': xjtuToken,
    'Host': `org.xjtu.edu.cn`,
    'appVersion': `6.2.3`,
    'Accept-Language': `zh-Hans-CN;q=1, en-CN;q=0.9`,
    'Accept': `*/*`
};

const codeRequest = {
    url: codeUrl,
    method: method,
    headers: headers
};

function getCode() {
    return $.http.get(codeRequest).then(response => {
        console.log(response.statusCode + "\n\n" + response.body);
        var res = JSON.parse(response.body);
        if (res.data) {
            code = res.data;
        }
    })
}

function getCardBalance() {
    var timestamp = new Date().getTime()
    const cardInfoUrl = `http://org.xjtu.edu.cn/openplatform/toon/open/getCardInfoByEmpid?_t=` + timestamp + `&employeeno=` + xjtuID;
    const cardInfoHeaders = {
        'Accept': `application/json, text/plain, */*`,
        'Connection': `keep-alive`,
        'Content-Type': `application/json`,
        'code': code,
        'Host': `org.xjtu.edu.cn`,
        'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 toon/6.2.3 toonType/150 msgsealType/1150 toongine/1.0.9 toongineBuild/9 platform/iOS language/zh-Hans skin/white fontIndex/0`,
        'Referer': `http://org.xjtu.edu.cn/h5/campuscard.html?code=` + code + `&comeAcc=` + xjtuID,
        'Accept-Language': `zh-CN,zh-Hans;q=0.9`,
        'Accept-Encoding': `gzip, deflate`
    };

    const cardInfoRequest = {
        url: cardInfoUrl,
        method: method,
        headers: cardInfoHeaders
    };

    return $.http.get(cardInfoRequest).then(response => {
        console.log(response.statusCode + "\n\n" + response.body);
        var res = JSON.parse(response.body)
        var balance = parseFloat(res.data.xcardBalance)
        if (balance <= warn_balance) {
            msg = '该充一卡通了！' + '\n一卡通余额： ' + balance
            $.msg('该充一卡通了！', '一卡通余额： ' + balance)
            if (push_enabled) {
                if (tgbotChatid != '' && tgbotToken != "") {
                    $.http.post({
                        url: 'https://api.telegram.org/bot' + tgbotToken + '/sendMessage',
                        headers:{},
                        body:`chat_id=${tgbotChatid}&text=${msg}`
                    })
                }
                if (barkURL != '') {
                    $.http.get({
                        url: barkURL + "/%E8%AF%A5%E5%85%85%E4%B8%80%E5%8D%A1%E9%80%9A%E4%BA%86%EF%BC%81/%E4%B8%80%E5%8D%A1%E9%80%9A%E4%BD%99%E9%A2%9D%EF%BC%9A" + balance + "?group=xjtu&autoCopy=1&isArchive=1&icon=https%3A%2F%2Fraw.githubusercontent.com%2FGilesWong%2FScripts%2Fmain%2Fimg%2Fxjtu.png&sound=shake&level=timeSensitive",
                    })
                }
            }
        } else {
            $.msg('一卡通余额 ' + res.data.xcardBalance)
        }
        
    }, reason => {
        console.log(reason.error);
    })
}

(async function() {
    await getCode();
    await getCardBalance();
})().catch((e) => $.msg(e.message || e)).finally(() => {
    $.done();
})



function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,a)=>{s.call(this,t,(t,s,r)=>{t?a(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const a=this.getdata(t);if(a)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,a)=>e(a))})}runScript(t,e){return new Promise(s=>{let a=this.getdata("@chavy_boxjs_userCfgs.httpapi");a=a?a.replace(/\n/g,"").trim():a;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[i,o]=a.split("@"),n={url:`http://${o}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":i,Accept:"*/*"},timeout:r};this.post(n,(t,e,a)=>s(a))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e);if(!s&&!a)return{};{const a=s?t:e;try{return JSON.parse(this.fs.readFileSync(a))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),a=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):a?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const a=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of a)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,a)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[a+1])>>0==+e[a+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,a]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,a,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,a,r]=/^@(.*?)\.(.*?)$/.exec(e),i=this.getval(a),o=a?"null"===i?null:i||"{}":"{}";try{const e=JSON.parse(o);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),a)}catch(e){const i={};this.lodash_set(i,r,t),s=this.setval(JSON.stringify(i),a)}}else s=this.setval(t,e);return s}getval(t){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.read(t);case"Quantumult X":return $prefs.valueForKey(t);case"Node.js":return this.data=this.loaddata(),this.data[t];default:return this.data&&this.data[t]||null}}setval(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":return $persistentStore.write(t,e);case"Quantumult X":return $prefs.setValueForKey(t,e);case"Node.js":return this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0;default:return this.data&&this.data[e]||null}}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){switch(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"],delete t.headers["content-type"],delete t.headers["content-length"]),t.params&&(t.url+="?"+this.queryStr(t.params)),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:a,statusCode:r,headers:i,rawBody:o}=t,n=s.decode(o,this.encoding);e(null,{status:a,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:a,response:r}=t;e(a,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";switch(t.body&&t.headers&&!t.headers["Content-Type"]&&!t.headers["content-type"]&&(t.headers["content-type"]="application/x-www-form-urlencoded"),t.headers&&(delete t.headers["Content-Length"],delete t.headers["content-length"]),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,a)=>{!t&&s&&(s.body=a,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,a)});break;case"Quantumult X":t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:a,headers:r,body:i,bodyBytes:o}=t;e(null,{status:s,statusCode:a,headers:r,body:i,bodyBytes:o},i,o)},t=>e(t&&t.error||"UndefinedError"));break;case"Node.js":let a=require("iconv-lite");this.initGotEnv(t);const{url:r,...i}=t;this.got[s](r,i).then(t=>{const{statusCode:s,statusCode:r,headers:i,rawBody:o}=t,n=a.decode(o,this.encoding);e(null,{status:s,statusCode:r,headers:i,rawBody:o,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&a.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let a={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in a)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?a[e]:("00"+a[e]).substr((""+a[e]).length)));return t}queryStr(t){let e="";for(const s in t){let a=t[s];null!=a&&""!==a&&("object"==typeof a&&(a=JSON.stringify(a)),e+=`${s}=${a}&`)}return e=e.substring(0,e.length-1),e}msg(e=t,s="",a="",r){const i=t=>{switch(typeof t){case void 0:return t;case"string":switch(this.getEnv()){case"Surge":case"Stash":default:return{url:t};case"Loon":case"Shadowrocket":return t;case"Quantumult X":return{"open-url":t};case"Node.js":return}case"object":switch(this.getEnv()){case"Surge":case"Stash":case"Shadowrocket":default:{let e=t.url||t.openUrl||t["open-url"];return{url:e}}case"Loon":{let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}case"Quantumult X":{let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,a=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":a}}case"Node.js":return}default:return}};if(!this.isMute)switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":default:$notification.post(e,s,a,i(r));break;case"Quantumult X":$notify(e,s,a,i(r));break;case"Node.js":}if(!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),a&&t.push(a),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){switch(this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:this.log("",`❗️${this.name}, 错误!`,t);break;case"Node.js":this.log("",`❗️${this.name}, 错误!`,t.stack)}}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;switch(this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),this.getEnv()){case"Surge":case"Loon":case"Stash":case"Shadowrocket":case"Quantumult X":default:$done(t);break;case"Node.js":process.exit(1)}}}(t,e)}