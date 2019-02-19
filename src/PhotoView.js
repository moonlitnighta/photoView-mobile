/*!
 * PhotoView.js v1.0
 * 2016.5.6 NocturneFFg
 */ 

(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        (global.PhotoView = factory());
}(this, (function() {
    'use strict';

    var win = window , 
		doc = win.document ,
		timeOut = 200 ,
    	extract = /url\("*([^"]*)"*\)/ ,
    	view = null ,
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

    if(!Object.assign){
        Object.assign = function (){
            var obj = Array.prototype.pop.call(arguments);
            if(arguments.length == 0) return obj;
            var l = arguments.length;
            for(var k in obj){
                arguments[l-1][k] = obj[k];
            }
            return Object.assign.apply(Object , arguments);
        }
    }

    /**
    * loading
    **/
    var loading = {
    	loadingTimeout:null,
    	show: function(timeOut){
	    	win.clearTimeout(this.loadingTimeout);
	    	this.loadingTimeout = setTimeout(function (){
	    		view.loading.style.display = 'block';
	    		this.loadingTimeout = setTimeout(function (){
	    			view.loading.style.display = 'none';
	    		} , timeOut)
	    	} , 250)
	    },
	    hide: function (){
	    	win.clearTimeout(this.loadingTimeout);
	    	view.loading.style.display = 'none';
	    }
    };

    //PhotoView
    function PhotoView(options){
    	//修正
    	if(!(this instanceof PhotoView)){
    		return new PhotoView(options);
    	}
    	//合并并检查参数
    	if(!(this.options = mergeOptions(options))){
    		return;
    	}
    	//初始化视图样式并加载图片
    	open(this.options , initView(this.options));
    }

    /**
	* 关闭view
	**/
    PhotoView.prototype.close = function (){
    	closeComplete.load = !(view.state = false);

    	var options = this.options ,
    		closeStyle = {} , 
    		currentDom = view.container.childNodes[this.options.imgIndex] , 
    		imgDom = currentDom.childNodes[0];

		currentDom.className = 'image-view-transition-close';
		imgDom.style.transition = options.urlMode ? 'opacity .3s' : 'opacity .2s';
		addComplete(currentDom , options , false);

    	//计算关闭时的元素归位
        if (!options.urlMode) {
        	var size = getBackSize(
        		closeStyle = getReferenceStyle(options.imageTag[options.imgIndex] , currentDom) ,
        		currentDom.imgWidth , currentDom.imgHeight
        	);
        	closeStyle.translateX = closeStyle.translateX + this.options.imgIndex * doc.body.clientWidth;
        	closeStyle.sizeY = size.sizeY;
        	closeStyle.sizeX = size.sizeX;
        }

        //关闭view
        setTimeout(function (){
    		view.bag.style.opacity = imgDom.style.opacity = 0;
	    	options.urlMode && (currentDom.style.opacity = 0);
	    	setTransform(
				currentDom.style ,
				'translate3d('+
					(closeStyle.translateX || '0') + 'px,' + 
					(closeStyle.translateY || '0') + 'px,0) scale3d(' + 
					(closeStyle.scaleX || .2) + ',' + (closeStyle.scaleY || .2) + ',1)'
			);
			currentDom.style.backgroundSize = (closeStyle.sizeX || 100) + '% ' + ( closeStyle.sizeY || 100 ) + '%';
    	} , 8);
    }

    /**
    * 图片控制
    **/
    function control(node){
    	var options ,
    		container ,
            indexTags ,
    		data , d ,
    		state = true , 
    		timeOut = null ,
    		doubleClick = 0 ,
            touchNum = 0 ,
    		img = null ,
    		s , r , scale , pos , clientY , clientX , _clientY , _clientX , cx = 0 , _cx , touchmove , isSlide ,
    		zoom = [] ,
    		screenWidth = doc.body.clientWidth , 
    		screenHeight = doc.body.clientHeight ,
    		touchTime ;

    	node.addEventListener('touchstart' , eventFun);
    	node.addEventListener('touchmove' , eventFun)
    	node.addEventListener('touchend' , eventFun);

    	function eventFun(e){
            e.stopPropagation(); 
            e.preventDefault(); 
    		if(!view.state || e.target.className !== 'image-view-img') return;
    		var touches = e.targetTouches;

    		switch (e.type){
    			case 'touchstart':{
    				//滑动或者单双击
    				if(touches.length == 1){
    					timeOut && win.clearTimeout(timeOut);
	    				doubleClick ++;
	    				touchTime = e.timeStamp;
	    				clientX = touches[0].clientX;
	    				clientY = touches[0].clientY;
    				}
    				//缩放
    				if(touches.length == 2){
    					s = getSpacing(touches[0] , touches[1]) / 200;
    				}
    				break;
    			}
    			case 'touchmove':{
    				//发生滑动缩放时阻止单击响应
    				doubleClick = 0;
    				if(touches.length == 1 && r == 0){
                        if(touchmove || Math.abs(touches[0].clientX - clientX) > 10 || Math.abs(touches[0].clientY - clientY) > 10){
        					touchmove = true;
                            if(!isSlide){
            					_clientX = touches[0].clientX - clientX;
            					_clientY = touches[0].clientY - clientY;
                            }
                            var _x = revert('get' , -1 , d.left + (touches[0].clientX - clientX));
        					!isSlide && setScale( _clientX , _clientY , scale);
        					if(_x < 0 && options.imgIndex > 0){
        						isSlide = true , _cx = _x;
                                _clientY = touches[0].clientY - clientY;
                                setScale( _clientX , _clientY , scale);
        						setTransform(container.style , 'translate3d('+ (cx - _x) +'px , 0 , 0)');
        					} else if (_x > 0 && options.imgIndex < options.urls.length - 1){
        						isSlide = true , _cx = _x;
                                _clientY = touches[0].clientY - clientY;
                                setScale( _clientX , _clientY , scale);
    							setTransform(container.style , 'translate3d('+ (cx - _x) +'px , 0 , 0)');
        					} else {
        						_cx = 0 , isSlide = false;
        					}
                        }
    				}
    				//缩放
    				if(touches.length == 2 && !touchmove){
                        touchNum = 1;
    					r = getSpacing(touches[0] , touches[1]) / 200 - s;
    					pos = getCenter(touches[0] , touches[1]);
    					setScale(0 , 0 , scale + r);
    					img.style.transformOrigin = pos.x + 'px ' + pos.y + 'px';
    				}
    				break;
    			}
    			case 'touchend':{
    				isSlide = false;
                    if(touchNum === 2) return;

                    //缩放 - 复位
                    if(touchNum === 1){
                        touchNum = 2;
                        if( (scale + r) * d.imgW < zoom[0]){
                            scale = zoom[0] / d.imgW;
                            revert('min');
                        } else if((scale + r) * d.imgW > zoom[1]){
                            scale = zoom[1] / d.imgW;
                            revert('max');
                        } else {
                            scale = scale + r;
                            revert();
                        }
                        return;
                    }

    				//关闭
					if(e.timeStamp - touchTime < 200){
    					if(doubleClick < 3 && doubleClick > 0){
    						state ? (timeOut = setTimeout(close , 200)) : (doubleClick = 0);
    					}

    					doubleClick ++;
    					if(doubleClick >= 4){
    						doubleClick = 0;
    						scale = d.imgW > screenWidth ? (screenWidth / d.imgW) : (zoom[1] / d.imgW);
    						pos = {
    							x:e.changedTouches[0].clientX - d.left , 
    							y:e.changedTouches[0].clientY - d.top
    						}
    						img.style.transformOrigin = pos.x + 'px ' + pos.y + 'px';
    						revert('min');
    					}		
    				} else {
    					doubleClick = 0;
    				}

    				//移动 - 复位
    				if(touchmove){
    					var x = e.changedTouches[0].clientX - clientX;
						var y = e.changedTouches[0].clientY - clientY;
						var res = revert('get' , d.top + y , d.left + x);
							x = res.x ? x + res.x : x;
							y = res.y ? y + res.y : y;
		
						if(res.x || res.y){
							revertScale(x , y , touchmoveRevert.bind({} , d , img , x , y , options.imgIndex));
						} else {
							touchmoveRevert(d , img , x , y , options.imgIndex);
						}

						if(_cx > 0 && _cx > screenWidth / 2.6){
                            indexTags[options.imgIndex].style.opacity = '.4';
							options.imgIndex ++;
							next();
						} else if(_cx < 0 && _cx < -(screenWidth / 2.6)){
                            indexTags[options.imgIndex].style.opacity = '.4';
							options.imgIndex --;
							next();
						} else {
							revertScale(cx , 0 , 1 , container , 1);
						}
    				}
    				break;
    			}
    		}
    	}

        var next = function (){
            revertScale((cx = 0 - screenWidth * options.imgIndex) , 0 , 1 , container , 1);
            clearData(options);
        }
    	function touchmoveRevert(d , node , x , y , i){
    		d.top = d.top + y;
			d.left = d.left + x;
			node.style.top = d.top + 'px';
			setLeft(d.left , node , i);
			setTransform(node.style , 'translate3d(0 , 0 , 0) scale(1)');
			touchmove = false;
    	}
    	function revert(type , _t , _l){
    		var w = d.imgW * scale ,
    			h = d.imgH * scale , 
    			t = _t !== undefined ? _t : (d.top - (pos.y * scale - pos.y)) ,
    			l = _l !== undefined ? _l : (d.left - (pos.x * scale - pos.x));

    		var x = screenWidth >= w ? (screenWidth / 2 - w / 2 - l) : 
    		    l >= 0 ? 0 - l : 
    		    (w + l < screenWidth) ? screenWidth - (w + l) : 0;
			if(type == 'get' && _t == -1){ return x };
			var y = screenHeight >= h ? (screenHeight / 2 - h / 2 - t) :
				t >= 0 ? 0 - t :
				(h + t < screenHeight) ? screenHeight - (h + t) : 0;
    		
    		if(type == 'get'){
    			return {
    				x:x,
    				y:y
    			}
    		}

    		l = x + l , t = y + t;
    		if(x !== 0 || y !== 0 || type){
				revertScale(x , y , callback);
    			return;
    		}
    		callback();
    	
  			function callback(){
  				img.style.top = (d.top = t) + 'px';
		    	setLeft((d.left = l) , img , options.imgIndex);
    			img.style.width = (d.imgW = w) + 'px';
	    		img.style.height = (d.imgH = h) + 'px';
	    		setTransform(img.style , 'translate3d(0 , 0 , 0) scale(1)');
	    		img.style.transformOrigin = '50% 50%';
	    		scale = 1;
    		}
    	}
    	function setLeft(l , node , i){
    		node.style.left = screenWidth * i + l + 'px';
    	}
    	function close(){
    		PhotoView.prototype.close.call({options:options});
    	}
    	function setScale(x , y , s , node){
    		setTransform((node || img).style , 'translate3d('+ x +'px , '+ y +'px , 0) scale('+s+')');
    	}
    	function revertScale(x , y , callback , node , s){
    		(node || img).className = "image-view-transition";
    		setScale(x || 0 , y || 0 , scale || s , node);
    		state = false;
    		setTimeout(function (){
    			(node || img).className = " ";
    			state = true;
                r = 0;
                touchNum = 0;
    			typeof callback === 'function' && callback();
    		} , 350);
    	}
    	function getSpacing(s , e){
			var d1 = s.clientX - e.clientX;
	        var d2 = s.clientY - e.clientY;
	        var r = Math.pow((d1 * d1 + d2 * d2), 0.5);
	        return r;
		};
		function getCenter(s , e){
			var x = s.clientX >= e.clientX ? ((s.clientX - e.clientX) / 2 + e.clientX) : ((e.clientX - s.clientX) / 2 + s.clientX);
	        var y = s.clientY >= e.clientY ? ((s.clientY - e.clientY) / 2 + e.clientY) : ((e.clientY - s.clientY) / 2 + s.clientY);

	        return {
	        	x:x - d.left,
	        	y:y - d.top
	        }
		};
    	function clearData(opt){
    		img = view.container.childNodes[opt.imgIndex];
            indexTags[options.imgIndex].style.opacity = 1;
    		d = data[opt.imgIndex];
    		var style = win.getComputedStyle(img);
    		s = r = 0;
    		scale = 1;
    		doubleClick = 0;
    		if(d.imgW == null){
    			d.left = 0;
	    		d.top = parseFloat(style.top);
	    		d.imgH = parseFloat(style.height);
	    		d.imgW = parseFloat(style.width);
    		}
    		zoom[0] = screenWidth * opt.zoom[0];
    		zoom[1] = screenWidth * opt.zoom[1];
            if(!img.imgState){
                img.imgState = 'loading';
                loading.show(opt.timeOut);
            }
    	}
    	control.setOptions = function (opt){
    		options = opt;
    		data = [];
			cx = 0 - (opt.imgIndex * screenWidth);
			options.urls.forEach(function (){data.push({
				imgW : null ,
				imgH : null ,
				top : null ,
				left : null
			})});
    		container = view.container;
            indexTags = view.index.querySelectorAll('li');
    		touchTime = timeOut = null;
    		clearData(opt);
    	}
    }

    /**
    * 合并 options
    **/
    function mergeOptions(sourceOpt){
    	if(!sourceOpt || (!sourceOpt.urls && !sourceOpt.imageTag)){
    		console.warn('PhotoView: Please add an image source (urls or imageTag)');
    		return;
    	}

        var options = Object.assign({} , defaultOption , sourceOpt);   
    		options.urlMode = !!options.urls;
	    	if(!options.urlMode){
	    		//提取url
	    		var urls = extractUrl(options);
	    		options.source = urls.source;
	    		options.urls = urls.urls;
	    	}
	    	options.reference = options.reference || (options.urlMode ? null : options.imageTag[options.imgIndex]);

    	return options;
    }

    /**
    * 视图
    **/
    function createView(options){
    	var view = doc.createElement('div');
    	var bagStyle =  'width: 100%;' +
						'height: 100%;' + 
						'position: absolute;' +
						'z-index: 1;' +
						'top: 0;' +
						'background-color:#000;' + 
						'left: 0;' +
						'transition: opacity .25s;' +
						'opacity: 0;';
    	var containerStyle =    'height: 100%;' +
								'position: absolute;' +
								'left: 0;' +
								'top: 0;' +
								'z-index: 2;';
    	view.style.cssText = 	'width: 100%;' +
								'height: 100%;' +
								'z-index: ' + options.zIndex + ';' +
								'position: fixed;' +
								'top: 0;' +
								'left: 0;';
    	view.innerHTML = 
    		'<style>'+
    			'.image-view-transition{transition: transform .3s , -webkit-transform .3s , -moz-transform .3s , -ms-transform .3s , background-image .3s , background-size .2s}' +
    			'.image-view-transition-close{transition: transform .35s , opacity .35s , -webkit-transform .35s , -moz-transform .35s , -ms-transform .35s , background-image .35s , background-size .45s}' +
    			'#image-view-loading{width:100%;height:100%;position:absolute;z-index:3;left:0;top:0;display:none}' +
    			'#image-view-loading svg{position:absolute; top:45%; left:45%;}' +
    			'.image-view-img{width:100%;height:100%;transition:opacity .4s;opacity:0;}' +
                '#image-view-index{width:100%;height:8px;position:absolute;left:0;bottom:15%;text-align: center;z-index: 4; display:none;}' +
                '#image-view-index li{display: inline-block;width:8px;height:8px;background-color:#fff;opacity:.4;margin:0 4px;border-radius: 100%;}' +
    		'</style>'+
    		'<div id="image-view-loading">'+
    			'<svg width="10%" height="10%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" class="lds-rolling"><circle cx="50" cy="50" fill="none" ng-attr-stroke="{{config.color}}" ng-attr-stroke-width="{{config.width}}" ng-attr-r="{{config.radius}}" ng-attr-stroke-dasharray="{{config.dasharray}}" stroke="'+options.loadingColor+'" stroke-width="10" r="35" stroke-dasharray="164.93361431346415 56.97787143782138" transform="rotate(329.324 50 50)"><animateTransform attributeName="transform" type="rotate" calcMode="linear" values="0 50 50;360 50 50" keyTimes="0;1" dur="1s" begin="0s" repeatCount="indefinite"></animateTransform></circle></svg>' +
    		'</div>'+
    		'<div id="image-view-bag" style="'+ bagStyle +'"></div>' +
            '<ul id="image-view-index"></ul>' +
			'<div id="image-view-container" style="'+ containerStyle +'"></div>';

		//为视图绑定控制事件
    	control(view);

    	return {
    		root:view,
    		bag:view.querySelector('#image-view-bag'),
    		loading:view.querySelector('#image-view-loading'),
    		container:view.querySelector('#image-view-container'),
            index:view.querySelector('#image-view-index'),
    	};
    }

    /**
    * 初始化view样式及图片项
    **/
    function initView(options){

    	//创建视图
    	view = view || createView(options);
    	var imageTags = '' , indexTag = '' ,
    		screenWidth = doc.body.clientWidth , 
    		screenHeight = doc.body.clientHeight ,
    		imgLayout = {
	    		height:screenWidth,
	    		scaleX:.2,
	    		scaleY:.2,
	    		translateX:0,
	    		translateY:0,
	    		backColor:'#000',
	    		backPos:'center',
	    		backSize:'cover',
	    		referenceW:screenWidth,
	    		referenceH:screenWidth
	    	}

    	//计算并填充图片个数
    	options.urls.forEach(function (url , i){
    		imageTags += '<div id="image-view-' + i +'" style="width:'+screenWidth+'px;height:100%;position:absolute;top:0;left:'+ (screenWidth * i) +'px;background-size:100% 100%;background-repeat:no-repeat;background-position:center;"><div class="image-view-img"></div></div>';
            indexTag += '<li></li>';
    	}); 
    	view.container.innerHTML = imageTags;
        view.index.innerHTML = indexTag;

    	//设置图片父容器初始样式
    	view.container.style.width = options.urls.length * screenWidth + 'px';
    	setTransform(view.container.style , 'translate3d('+(0 - screenWidth * options.imgIndex)+'px , 0 , 0)');
    	
    	//如果有参照物，则获取参照物大小 并计算imgIndex对应的图片的大小及位置
    	if(options.reference){
    		imgLayout = getReferenceStyle(options.reference);
    	}

    	//设置弹出前的首张图的基本样式
    	imgLayout.dom = view.container.querySelector('#image-view-' + options.imgIndex);
    	imgLayout.dom.style.height = imgLayout.height + 'px';
    	imgLayout.dom.style.backgroundPosition = imgLayout.backPos;
    	imgLayout.dom.style.backgroundSize = imgLayout.backSize;
		imgLayout.dom.style.top = (screenHeight - imgLayout.height) / 2 + 'px';
		imgLayout.dom.className = 'image-view-transition';
		setTransform(
			imgLayout.dom.style ,
			'translate3d('+imgLayout.translateX+'px , '+imgLayout.translateY+'px , 0) scale3d('+imgLayout.scaleX+','+imgLayout.scaleY+',1)'
		);

		!options.urlMode && (imgLayout.dom.style.backgroundImage = 'url('+options.source[options.imgIndex]+')');

		//绑定动画事件 监听view是否加载完成
		addComplete(imgLayout.dom , options , true);

		//将视图添加到页面
		doc.body.appendChild(view.root);

		//返回首图的布局样式
    	return imgLayout;
    }

    /**
	* 加载首张图片并打开视图
	**/
	function open(options , firstImg){
		var url = options.urls[options.imgIndex];
		var out = null;
		var screenWidth = doc.body.clientWidth;
    	var screenHeight = doc.body.clientHeight;

    	//加载图片并获取大小 根据大小计算背景size比例
		getImageSize(url , function (w , h){
			win.clearTimeout(out);

			//url的模式直接返回
			if(options.urlMode){
				firstImg.dom.style.height = screenWidth / (w / h) + 'px';
				firstImg.dom.style.top = (screenHeight - screenWidth / (w / h)) / 2 + 'px';
                firstImg.dom.style.backgroundColor = '#000';
                firstImg.dom.style.backgroundImage = 'url('+url+')';
				firstImg.scaleX = 1;
				firstImg.scaleY = 1;
				popup(options , firstImg);
				return;
			}

			var size = getBackSize(firstImg , w , h);
				firstImg.dom.style.backgroundSize = size.sizeX + '% ' + size.sizeY + '%';
		    	firstImg.scaleX = 1;
		    	firstImg.scaleY = (screenWidth / (w / h)) / firstImg.height;
		    	firstImg.dom._height = screenWidth / (w / h);
		    	firstImg.dom.imgHeight = h;
		    	firstImg.dom.imgWidth = w;
				popup(options , firstImg );

		} , function (){
			loading.hide();
            firstImg.dom.imgState = true;
            if(options.urlMode) return;

            var img = firstImg.dom.childNodes[0];
                    img.style.backgroundSize = '100% 100%' ;
                    img.style.backgroundImage = 'url(' + url + ')';

			//加载其他图片的略缩图
			if(options.source){
				view.container.childNodes.forEach(function (dom , i){
					i !== options.imgIndex && (dom.style.backgroundImage = 'url('+options.source[i]+')');
				})
			}
		});			

		//加载图片最多等待200毫秒
		out = setTimeout(function (){
			loading.show(options.timeOut);
			!options.urlMode && (firstImg.dom.style.backgroundColor = firstImg.backColor);
			view.bag.style.opacity = 1;
			setTransform(
					firstImg.dom.style ,
					'translate3d(0 , 0 , 0) scale3d('+firstImg.scaleX+','+firstImg.scaleY+',1)'
				);
		} , timeOut);
	}

    /**
    * 获取未缓存图片的大小
    **/
    function getImageSize(url , sizeBack , loadBack , time){
    	var img = new Image();
    		img.src = url;
	    	img.onload = function (){
	    		typeof loadBack === 'function' && loadBack();
	    	}
    	var timeout = setInterval(function (){
    		if(img.width && img.height){
    			window.clearInterval(timeout);
    			typeof sizeBack === 'function' && sizeBack(img.width , img.height);
    		}
    	} , time || 20);
    }

   	/**
    * 在imageTag中提取url
    **/
    function extractUrl(options){
    	var urls = [] , source = [];
    	var parent = options.parentTag;
    	options.parentTag = parent ? typeof parent === 'string' ? doc.querySelector(parent) : parent : doc.body;
    	var imageTag = options.imageTag = options.parentTag.querySelectorAll(options.imageTag);

    	for(var i = 0 , l = imageTag.length; i < l; i ++){
    		source.push(
    			imageTag[i].nodeName === 'IMG' ? 
    			imageTag[i].src : 
    			win.getComputedStyle(imageTag[i] , null).backgroundImage.match(extract)[1]
    		);
    	}

    	urls =  options.filter ? typeof options.filter === 'function' ?
    			source.map(function (url){ return options.filter(url)}) :
		    	source.map(function (url){ return url.split('?')[0]}) : source;
    	return {
    		urls : urls , 
    		source : source
    	};
    }

    /**
    * 计算参照元素的样式
    **/
    function getReferenceStyle (node , img){
    	var screenWidth = doc.body.clientWidth , 
    		screenHeight = doc.body.clientHeight , 
    		referenceStyle = win.getComputedStyle(node) ,
    		bounding = node.getBoundingClientRect() ,
			isIMG = node.nodeName === 'IMG' ,
			referenceW = bounding.width ,
			referenceH = bounding.height ,
			referenceX = bounding.left ,
			referenceY = bounding.top;
	
			referenceW = referenceW || referenceH;
			referenceH = referenceH || referenceW;

		var	height = img ? parseFloat(img.style.height) : (screenWidth / (referenceW / referenceH));
		var w = img ? parseFloat(img.style.width) : screenWidth;
		var h = img ? parseFloat(img.style.height) : screenHeight;
		var t = img ? parseFloat(img.style.top) : 0;
		var l = img ? parseFloat(img.style.left) : 0;

		return {
    		height:referenceW ? height : screenWidth,
    		scaleX:referenceW ? (referenceW / w) : .2,
    		scaleY:referenceW ? (referenceH / height) : .2,
    		translateX:referenceW ? (referenceX - (w / 2) + referenceW / 2 - l) : 0,
    		translateY:referenceW ? (referenceY - (h / 2) + referenceH / 2 - t) : 0,
    		backColor:isIMG ? '#000' : referenceStyle.backgroundColor,
    		backPos:isIMG ? 'center' : referenceStyle.backgroundPosition,
    		backSize:isIMG ? 'cover' : referenceStyle.backgroundSize,
    		referenceW:referenceW || screenWidth,
    		referenceH:referenceH || screenWidth
    	};
    }

    /**
    * 根据参照元素计算图片背景的size
    **/
    function getBackSize(firstImg , w , h){
    	var sizeX , sizeY ,
			containerW = firstImg.referenceW ,
			containerH = firstImg.referenceH ,
			_imgH = containerW / (w / h);

		if(firstImg.backSize == 'cover'){
			_imgH > containerH ? 
			(sizeX = 100 , sizeY = _imgH / containerH * 100) :
			(sizeY = 100 , sizeX = ((w / h) * containerH) / containerW * 100);
		} else if(firstImg.backSize == 'contain'){
			_imgH > containerH ? 
			(sizeY = 100 , sizeX = ((w / h) * containerH) / containerW * 100) :
			(sizeX = 100 , sizeY = _imgH / containerH * 100);
		} else {
			sizeX = containerW > w ? (containerW / w * 100) : (w / containerW * 100);
			sizeY = containerH > h ? (containerH / h * 100) : (h / containerH * 100);
		}

		return {
			sizeX:sizeX,
			sizeY:sizeY
		}
    }

    /**
	* view已弹出
	**/
	function complete(img , options){
		view.state = true;
		popup.isShow = false;
		var imgTag = img.childNodes[0];
		imgTag.style.opacity = 1;

		var screenWidth = doc.body.clientWidth;
    	var screenHeight = doc.body.clientHeight;
		var nodes = view.container.childNodes;

		//图片复位
		img.className = '';
		setTransform(
				img.style ,
				'translate3d(0 , 0 , 0) scale3d(1,1,1)'
			);
		img.style.height = img._height + 'px';
		img.style.top = (screenHeight - img._height) / 2 + 'px';
        view.index.style.display = 'block';
        view.index.querySelectorAll('li')[options.imgIndex].style.opacity = 1;

		//更新视图控制选项
    	control.setOptions(options);

		//加载其他图片
		options.urls.forEach(function (url , i){
			if(i !== options.imgIndex){
				getImageSize(url , function (w , h){
					if(!nodes[i]) return;
					nodes[i].style.height = nodes[i]._height = screenWidth / ( w / h ) + 'px';
					nodes[i].style.top = (screenHeight - screenWidth / ( w / h )) / 2 + 'px';
					nodes[i].imgWidth = w;
					nodes[i].imgHeight = h;
				} , function (){
					if(!nodes[i]) return;
					var _img = nodes[i].childNodes[0]
					_img.style.backgroundImage = 'url('+ url +')';
					_img.style.backgroundSize = '100% 100%';
					_img.style.opacity = 1;
                    nodes[i].imgState == 'loading' && loading.hide();
                    nodes[i].imgState = true;
				} , 100);
			}
		});
	}

	/**
	* view已关闭
	**/
	function closeComplete(){
		view.state = false;
		doc.body.removeChild(view.root);
		view.container.innerHTML = '';
	}

	/**
	* 添加过度结束事件 监听view 状态
	**/
	function addComplete(dom , options , state){
		var events = ['transitionend' , 'webkitTransitionEnd' , 'mozTransitionEnd' , 'webkitTransitionEnd'];
		var fun = function (event){
			if(complete.load && state && event.propertyName === 'transform'){
				complete.load = false;
				events.forEach(function (name){
					dom.removeEventListener(name , fun);
				});
				complete(dom , options);
			}
			if(closeComplete.load && !state && event.propertyName === 'transform'){
				closeComplete.load = false;
				events.forEach(function (name){
					dom.removeEventListener(name , fun);
				});
				closeComplete();
			}
		}

		events.forEach(function (name){
			dom.addEventListener(name , fun);
		});
	}

    function setTransform(style , value){
    	style.transform = value;
    	style.MozTransform = value;
    	style.msTransform = value;
    	style.webkitTransform = value;
    }

	/**
	* 弹出view
	**/
	function popup(options , firstImg ){
        popup.isShow = complete.load = true;
		setTimeout(function (){
			view.bag.style.opacity = 1;
            firstImg.dom.style.backgroundSize = '100% 100%';
			setTransform(
				firstImg.dom.style ,
				'translate3d(0 , 0 , 0) scale3d('+firstImg.scaleX+','+firstImg.scaleY+',1)'
			);
			
		} , 30);
	}

    return PhotoView;

})));
