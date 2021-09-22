var responseBody = $response.body
console.log(responseBody)
var xjtuToken = responseBody['data']['personToken']
console.log(xjtuToken)
if (xjtuToken) {$prefs.setValueForKey(xjtuToken, 'xjtuToken')}
$done()
