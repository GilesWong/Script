var url = 'https://rest.shanbay.com/api/v2/quote/quotes/today/'

const request = {
    url: url,
    method: "GET"
}

$task.fetch(request).then(response => {
    var obj = JSON.parse(response.body);
    var str = obj.data.content + '  --' + obj.data.author + '\n' + obj.data.translation
    $notify("扇贝每日一句", '', str);
    $done();
}, reason => {
    $notify("扇贝每日一句", '运行出错', reason.error); 
    $done();
})