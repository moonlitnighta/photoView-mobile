# photoView-mobile
用于web移动端的图片预览插件
----------------------
<div>类似于微信朋友圈预览图片，包括放大缩小、滑动、双击缩放等</div>
<div>插件不依赖其他库，但需要平台支持css transform</div>
<br />
<br />

 ![image](https://github.com/moonlitnighta/flightGame/blob/master/file/ab00494b-40e0-4a4f-989a-277d23a97e50.gif)
 
<br />
<br />
使用

```javascript
引入PhotoView.js
var view = new PhotoView({
  parentTag:'#container',
  imageTag:'li',
  imgIndex:index,
  zoom:[.8 , 2],
  filter:function (v){ return v.replace('orj360' , 'large') }
});
```
<br />
选项

```javascript
defaultOption = {

	    	/*图片url，改选项会无视imageTag + parentTag的模式*/
			urls:null,

			/*图片源(承载图片的标签)可以是一个 id、class、或者标签名*/
			imageTag:null,

			/*在哪个范围内搜索指定的所有imageTag 可以是一个id、class(将默认取页面第一个元素)、或element，不传将默认body*/
			parentTag:null,

			/*当前显示的图片索引*/
			imgIndex:0,

			/*	
			view 首次显示时以哪个参照物弹出 可以是一个id、class、或element
			如果是imageTag + parentTag的模式一般应该是被点击的那个图片承载element，该模式下如果未传将根据imgIndex获取element
			如果是urls 模式将不会自己获取，view将参照屏幕中心弹出
			*/
			reference:null,

			/*是否对提取的url进行过滤*/
			filter:true,

			/*缩放倍数*/
			zoom:[.8 , 2.5],

			/*是否是直接使用 urls*/
	    	urlMode:null,

	    	/*如果无法获取reference大小的时候填写*/
	    	referenceW:null,
	    	referenceH:null,

	    	/*层级*/
	    	zIndex:100 ,

	    	/*加载图片超时时间*/
	    	timeOut: 60000 ,

	    	/*loading color*/
	    	loadingColor:'#ffffff'
	    };
  ```
  
  api
  
      view.close();
