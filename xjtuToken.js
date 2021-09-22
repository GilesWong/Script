var responseBody = $response.body
console.log(responseBody)
body = JSON.parse(responseBody)
var xjtuToken = body['data']['personToken']
console.log(xjtuToken)
if (xjtuToken) {
    $prefs.setValueForKey(xjtuToken, 'xjtuToken')
    $notify("获取XJTU_TOKEN成功")
}
$done()
