var express = require('express');
var router = express.Router();
var multiparty = require('multiparty');
var util = require('util');
var fs = require('fs');
var request = require('request');

/* 上传页面. */
router.get('/', function(req, res, next) {
    res.sendfile('./views/index.html');
});
/* 上传 */
router.post('/file/uploading', function(req, res, next)
{
    /* 生成multiparty对象，并配置上传目标路径 */
    var form = new multiparty.Form();
    /* 设置编辑 */
    form.encoding = 'utf-8';
    //设置文件存储路劲
    form.uploadDir = './public/files/';
    //设置文件大小限制
    form.maxFilesSize = 1 * 1024 * 1024;
    //上传后处理
    form.parse(req, function (err, fields, files)
    {
        // console.log("err==" + err, "fields==" + fields, "files==" + JSON.stringify(files));
        // var filesTemp = JSON.stringify(files, null, 2);
        if (err)
        {
            console.log('parse error:' + err);

            res.writeHead(200, {'content-type': 'text/plain;charset=utf-8'});
            res.write('文件上传失败=== 错误为=' + err);
            res.end();
            return;
        }
        else
        {
            //console.log('parse files:' + filesTemp);
            var inputFile = files.inputFile[0];
            var uploadedPath = inputFile.path;
            var strContType = inputFile["headers"]["content-type"];
            if (strContType !== "image/jpeg" && strContType !== "image/png")
            {
                res.writeHead(200, {'content-type': 'text/plain;charset=utf-8'});
                res.write('不是图片文件!!!!!!!!!');
                res.end();
                return;
            }

            var dstPath = './public/files/' + inputFile.originalFilename;
            //重命名为真实文件名
            fs.rename(uploadedPath, dstPath, function (err)
            {
                if (err)
                {
                    console.log('rename error:' + err);
                } else
                {

                    let bitmap = fs.readFileSync(dstPath);
                    let base64str = Buffer.from(bitmap, 'binary').toString('base64'); // base64编码

                    PostFaceData(base64str, res, dstPath);
                }
            })

        }
    })
});
module.exports = router;



var appKey = "X5CYnsaJJCgMJXMPo9JGyHWfsqWx80gr";
var appSec = "K1zHwlcl1RalyoLOH3vWLsouLDjPcl69";

var postData = {
    "api_key": appKey,
    "api_secret": appSec,
    "return_attributes": "gender,age,smiling,facequality,beauty,skinstatus,emotion,skinstatus,blur"
};

let PostFaceData = function(base64str, res, dstPath)
{
    postData.image_base64 = base64str;

    request.post({
        url: 'https://api-cn.faceplusplus.com/facepp/v3/detect',
        formData: postData
    }, function optionalCallback(err, httpResponse, body)
    {
        if (err)
        {
            return console.error('upload failed:', err);
        }
        //console.log('Upload successful!', typeof body);

        let strResult = FaceResult(JSON.parse(body));
        try
        {
            res.writeHead(200, {'content-type': 'text/plain;charset=utf-8'});
            res.write(strResult);
            res.end();

        } catch (e)
        {
            console.error("LKX== 解析失败== " + dstPath);
        }
    });
};


/**
 * @return {string}
 */
let FaceResult = function(body)
{
    let nNum = body.face_num;
    if (nNum <= 0)
    {
        return "图片中没有人脸";
    }
    if (nNum > 1)
    {
        return "人物过多,请剪切图片";
    }

    let faceArr = body.faces;

    for (let i in faceArr)
    {
        let oneFace = faceArr[i];
        let attributes = oneFace.attributes;

        //console.log("attributes=== " + JSON.stringify(attributes));

        let bMan = false;
        if (attributes.gender.value == "Female")
        {
            bMan = false;
        }
        else
        {
            bMan = true;
        }

        let blur = attributes.blur.blurness.value >= attributes.blur.blurness.threshold;

        let nAge = attributes.age.value;
        let bSmile = attributes.smile.value >= attributes.smile.threshold;
        let nBeauty = bMan ? attributes.beauty.male_score : attributes.beauty.female_score;
        let strBeauty = "没及格";
        if(nBeauty >= 80)
        {
            strBeauty = "较高"
        }else if(nBeauty >= 60)
        {
            strBeauty = "还行"
        }


        let emotion = attributes.emotion;
        let strEmotion = "普通";
        if(emotion.anger > 50) {strEmotion = "愤怒";}
        if(emotion.disgust > 50) {strEmotion = "厌恶";}
        if(emotion.fear > 50) {strEmotion = "恐惧";}
        if(emotion.happiness > 50) {strEmotion = "高兴";}
        if(emotion.neutral > 50) {strEmotion = "平静";}
        if(emotion.sadness > 50) {strEmotion = "伤心";}
        if(emotion.surprise > 50) {strEmotion = "惊讶";}

        let skinstatus = attributes.skinstatus;
        let strSkinstatus = "皮肤健康度="+skinstatus.health + " 色斑度="+skinstatus.stain+" 青春痘可能性="+skinstatus.acne+"% 黑眼圈可能性="+skinstatus.dark_circle+"%";



        return ""+(blur ? "这张图不怎么清楚" : "图片清晰度正常..") + "这个人是" + (bMan ? "男性" : "女性") +""+ (bSmile ? ", 正在笑" : "") +", 年龄是" + nAge + "岁左右," +
            " 颜值为" + nBeauty.toFixed(1)+' '+strBeauty+", 表情是"+strEmotion
            +" \n"+strSkinstatus;
    }
};
