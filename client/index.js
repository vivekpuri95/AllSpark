"use strict";

const express = require('express');
const router = express.Router();
const config = require('config');
const {promisify} = require('util');
const fs = require('fs');
const API = require('../server/utils/api');
const User = require('../server/utils/User');
const commonFunctions = require('../server/utils/commonFunctions');
const authentication = require('../server/www/authentication');
const {URLSearchParams} = require('url');

router.use(express.static('./client'));

class HTMLAPI extends API {

	constructor() {

		super();

		this.stylesheets = [
			'/css/main.css',
			'https://use.fontawesome.com/releases/v5.2.0/css/all.css" integrity="sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ" crossorigin="anonymous" f="'
		];

		this.scripts = [
			'/js/main.js',
			'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ace.js',
		];
	}

	async body() {

		let theme = 'light';

		if(this.request.query.download) {

			const token_details = await commonFunctions.getUserDetailsJWT(this.request.query.refresh_token);

			if(!token_details.error) {
				this.user = new User(token_details);
			}
		}

		if(!this.user && (this.request.cookies.token)) {

			const token_details = await commonFunctions.getUserDetailsJWT(this.request.cookies.token);

			if(!token_details.error)
				this.user = new User(token_details);
		}

		if(await this.account.settings.get('theme'))
			theme = await this.account.settings.get('theme');

		if(this.user && await this.user.settings.get('theme'))
			theme = await this.user.settings.get('theme');

		this.stylesheets.push(`/css/themes/${theme}.css`);

		if(this.account.settings.has('custom_css'))
			this.stylesheets.push('/css/custom.css');

		if(this.account.settings.get('custom_js'))
			this.scripts.push('/js/custom.js');

		let ga = '';

		if(config.has('ga_id')) {
			ga = `
				<script async src="https://www.googletagmanager.com/gtag/js?id=${config.get('ga_id')}"></script>
				<script>
					window.dataLayer = window.dataLayer || [];
					function gtag(){dataLayer.push(arguments);}
					gtag('js', new Date());

					gtag('config', '${config.get('ga_id')}');
				</script>
			`;
		}

		return `<!DOCTYPE html>
			<!--
				           _ _  _____                  _
				     /\\   | | |/ ____|                | |
				    /  \\  | | | (___  _ __   __ _ _ __| | __
				   / /\\ \\ | | |\\___ \\| '_ \\ / _\` | '__| |/ /
				  / ____ \\| | |____) | |_) | (_| | |  |   <
				 /_/    \\_\\_|_|_____/| .__/ \\__,_|_|  |_|\\_\\
				                     | |
				                     |_|
				   Welcome to the source, enjoy your stay.
		Find the entire code at https://github.com/Jungle-Works/AllSpark
			-->
			<html lang="en">
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<meta name="theme-color" content="#3e7adc">
					<title></title>
					<link id="favicon" rel="shortcut icon" type="image/png" href="" />

					${this.stylesheets.map(s => '<link rel="stylesheet" type="text/css" href="' + s + '?' + this.checksum + '">\n\t\t\t\t\t').join('')}
					${this.scripts.map(s => '<script src="' + s + '?' + this.checksum + '"></script>\n\t\t\t\t\t').join('')}

					<link rel="manifest" href="/manifest.webmanifest">
					${ga}
					<script>
						let onboard = '${config.has('onboard') ? JSON.stringify(config.get('onboard')) : ''}';
						var environment = ${JSON.stringify(this.environment) || '{}'};
					</script>

					<script type="text/javascript">
					window.NREUM||(NREUM={}),__nr_require=function(t,n,e){function r(e){if(!n[e]){var o=n[e]={exports:{}};t[e][0].call(o.exports,function(n){var o=t[e][1][n];return r(o||n)},o,o.exports)}return n[e].exports}if("function"==typeof __nr_require)return __nr_require;for(var o=0;o<e.length;o++)r(e[o]);return r}({1:[function(t,n,e){function r(t){try{s.console&&console.log(t)}catch(n){}}var o,i=t("ee"),a=t(16),s={};try{o=localStorage.getItem("__nr_flags").split(","),console&&"function"==typeof console.log&&(s.console=!0,o.indexOf("dev")!==-1&&(s.dev=!0),o.indexOf("nr_dev")!==-1&&(s.nrDev=!0))}catch(c){}s.nrDev&&i.on("internal-error",function(t){r(t.stack)}),s.dev&&i.on("fn-err",function(t,n,e){r(e.stack)}),s.dev&&(r("NR AGENT IN DEVELOPMENT MODE"),r("flags: "+a(s,function(t,n){return t}).join(", ")))},{}],2:[function(t,n,e){function r(t,n,e,r,s){try{p?p-=1:o(s||new UncaughtException(t,n,e),!0)}catch(f){try{i("ierr",[f,c.now(),!0])}catch(d){}}return"function"==typeof u&&u.apply(this,a(arguments))}function UncaughtException(t,n,e){this.message=t||"Uncaught error with no additional information",this.sourceURL=n,this.line=e}function o(t,n){var e=n?null:c.now();i("err",[t,e])}var i=t("handle"),a=t(17),s=t("ee"),c=t("loader"),f=t("gos"),u=window.onerror,d=!1,l="nr@seenError",p=0;c.features.err=!0,t(1),window.onerror=r;try{throw new Error}catch(h){"stack"in h&&(t(8),t(7),"addEventListener"in window&&t(5),c.xhrWrappable&&t(9),d=!0)}s.on("fn-start",function(t,n,e){d&&(p+=1)}),s.on("fn-err",function(t,n,e){d&&!e[l]&&(f(e,l,function(){return!0}),this.thrown=!0,o(e))}),s.on("fn-end",function(){d&&!this.thrown&&p>0&&(p-=1)}),s.on("internal-error",function(t){i("ierr",[t,c.now(),!0])})},{}],3:[function(t,n,e){t("loader").features.ins=!0},{}],4:[function(t,n,e){function r(t){}if(window.performance&&window.performance.timing&&window.performance.getEntriesByType){var o=t("ee"),i=t("handle"),a=t(8),s=t(7),c="learResourceTimings",f="addEventListener",u="resourcetimingbufferfull",d="bstResource",l="resource",p="-start",h="-end",m="fn"+p,v="fn"+h,w="bstTimer",y="pushState",g=t("loader");g.features.stn=!0,t(6);var b=NREUM.o.EV;o.on(m,function(t,n){var e=t[0];e instanceof b&&(this.bstStart=g.now())}),o.on(v,function(t,n){var e=t[0];e instanceof b&&i("bst",[e,n,this.bstStart,g.now()])}),a.on(m,function(t,n,e){this.bstStart=g.now(),this.bstType=e}),a.on(v,function(t,n){i(w,[n,this.bstStart,g.now(),this.bstType])}),s.on(m,function(){this.bstStart=g.now()}),s.on(v,function(t,n){i(w,[n,this.bstStart,g.now(),"requestAnimationFrame"])}),o.on(y+p,function(t){this.time=g.now(),this.startPath=location.pathname+location.hash}),o.on(y+h,function(t){i("bstHist",[location.pathname+location.hash,this.startPath,this.time])}),f in window.performance&&(window.performance["c"+c]?window.performance[f](u,function(t){i(d,[window.performance.getEntriesByType(l)]),window.performance["c"+c]()},!1):window.performance[f]("webkit"+u,function(t){i(d,[window.performance.getEntriesByType(l)]),window.performance["webkitC"+c]()},!1)),document[f]("scroll",r,{passive:!0}),document[f]("keypress",r,!1),document[f]("click",r,!1)}},{}],5:[function(t,n,e){function r(t){for(var n=t;n&&!n.hasOwnProperty(u);)n=Object.getPrototypeOf(n);n&&o(n)}function o(t){s.inPlace(t,[u,d],"-",i)}function i(t,n){return t[1]}var a=t("ee").get("events"),s=t(19)(a,!0),c=t("gos"),f=XMLHttpRequest,u="addEventListener",d="removeEventListener";n.exports=a,"getPrototypeOf"in Object?(r(document),r(window),r(f.prototype)):f.prototype.hasOwnProperty(u)&&(o(window),o(f.prototype)),a.on(u+"-start",function(t,n){var e=t[1],r=c(e,"nr@wrapped",function(){function t(){if("function"==typeof e.handleEvent)return e.handleEvent.apply(e,arguments)}var n={object:t,"function":e}[typeof e];return n?s(n,"fn-",null,n.name||"anonymous"):e});this.wrapped=t[1]=r}),a.on(d+"-start",function(t){t[1]=this.wrapped||t[1]})},{}],6:[function(t,n,e){var r=t("ee").get("history"),o=t(19)(r);n.exports=r,o.inPlace(window.history,["pushState","replaceState"],"-")},{}],7:[function(t,n,e){var r=t("ee").get("raf"),o=t(19)(r),i="equestAnimationFrame";n.exports=r,o.inPlace(window,["r"+i,"mozR"+i,"webkitR"+i,"msR"+i],"raf-"),r.on("raf-start",function(t){t[0]=o(t[0],"fn-")})},{}],8:[function(t,n,e){function r(t,n,e){t[0]=a(t[0],"fn-",null,e)}function o(t,n,e){this.method=e,this.timerDuration=isNaN(t[1])?0:+t[1],t[0]=a(t[0],"fn-",this,e)}var i=t("ee").get("timer"),a=t(19)(i),s="setTimeout",c="setInterval",f="clearTimeout",u="-start",d="-";n.exports=i,a.inPlace(window,[s,"setImmediate"],s+d),a.inPlace(window,[c],c+d),a.inPlace(window,[f,"clearImmediate"],f+d),i.on(c+u,r),i.on(s+u,o)},{}],9:[function(t,n,e){function r(t,n){d.inPlace(n,["onreadystatechange"],"fn-",s)}function o(){var t=this,n=u.context(t);t.readyState>3&&!n.resolved&&(n.resolved=!0,u.emit("xhr-resolved",[],t)),d.inPlace(t,y,"fn-",s)}function i(t){g.push(t),h&&(x?x.then(a):v?v(a):(E=-E,O.data=E))}function a(){for(var t=0;t<g.length;t++)r([],g[t]);g.length&&(g=[])}function s(t,n){return n}function c(t,n){for(var e in t)n[e]=t[e];return n}t(5);var f=t("ee"),u=f.get("xhr"),d=t(19)(u),l=NREUM.o,p=l.XHR,h=l.MO,m=l.PR,v=l.SI,w="readystatechange",y=["onload","onerror","onabort","onloadstart","onloadend","onprogress","ontimeout"],g=[];n.exports=u;var b=window.XMLHttpRequest=function(t){var n=new p(t);try{u.emit("new-xhr",[n],n),n.addEventListener(w,o,!1)}catch(e){try{u.emit("internal-error",[e])}catch(r){}}return n};if(c(p,b),b.prototype=p.prototype,d.inPlace(b.prototype,["open","send"],"-xhr-",s),u.on("send-xhr-start",function(t,n){r(t,n),i(n)}),u.on("open-xhr-start",r),h){var x=m&&m.resolve();if(!v&&!m){var E=1,O=document.createTextNode(E);new h(a).observe(O,{characterData:!0})}}else f.on("fn-end",function(t){t[0]&&t[0].type===w||a()})},{}],10:[function(t,n,e){function r(t){var n=this.params,e=this.metrics;if(!this.ended){this.ended=!0;for(var r=0;r<d;r++)t.removeEventListener(u[r],this.listener,!1);if(!n.aborted){if(e.duration=a.now()-this.startTime,4===t.readyState){n.status=t.status;var i=o(t,this.lastSize);if(i&&(e.rxSize=i),this.sameOrigin){var c=t.getResponseHeader("X-NewRelic-App-Data");c&&(n.cat=c.split(", ").pop())}}else n.status=0;e.cbTime=this.cbTime,f.emit("xhr-done",[t],t),s("xhr",[n,e,this.startTime])}}}function o(t,n){var e=t.responseType;if("json"===e&&null!==n)return n;var r="arraybuffer"===e||"blob"===e||"json"===e?t.response:t.responseText;return h(r)}function i(t,n){var e=c(n),r=t.params;r.host=e.hostname+":"+e.port,r.pathname=e.pathname,t.sameOrigin=e.sameOrigin}var a=t("loader");if(a.xhrWrappable){var s=t("handle"),c=t(11),f=t("ee"),u=["load","error","abort","timeout"],d=u.length,l=t("id"),p=t(14),h=t(13),m=window.XMLHttpRequest;a.features.xhr=!0,t(9),f.on("new-xhr",function(t){var n=this;n.totalCbs=0,n.called=0,n.cbTime=0,n.end=r,n.ended=!1,n.xhrGuids={},n.lastSize=null,p&&(p>34||p<10)||window.opera||t.addEventListener("progress",function(t){n.lastSize=t.loaded},!1)}),f.on("open-xhr-start",function(t){this.params={method:t[0]},i(this,t[1]),this.metrics={}}),f.on("open-xhr-end",function(t,n){"loader_config"in NREUM&&"xpid"in NREUM.loader_config&&this.sameOrigin&&n.setRequestHeader("X-NewRelic-ID",NREUM.loader_config.xpid)}),f.on("send-xhr-start",function(t,n){var e=this.metrics,r=t[0],o=this;if(e&&r){var i=h(r);i&&(e.txSize=i)}this.startTime=a.now(),this.listener=function(t){try{"abort"===t.type&&(o.params.aborted=!0),("load"!==t.type||o.called===o.totalCbs&&(o.onloadCalled||"function"!=typeof n.onload))&&o.end(n)}catch(e){try{f.emit("internal-error",[e])}catch(r){}}};for(var s=0;s<d;s++)n.addEventListener(u[s],this.listener,!1)}),f.on("xhr-cb-time",function(t,n,e){this.cbTime+=t,n?this.onloadCalled=!0:this.called+=1,this.called!==this.totalCbs||!this.onloadCalled&&"function"==typeof e.onload||this.end(e)}),f.on("xhr-load-added",function(t,n){var e=""+l(t)+!!n;this.xhrGuids&&!this.xhrGuids[e]&&(this.xhrGuids[e]=!0,this.totalCbs+=1)}),f.on("xhr-load-removed",function(t,n){var e=""+l(t)+!!n;this.xhrGuids&&this.xhrGuids[e]&&(delete this.xhrGuids[e],this.totalCbs-=1)}),f.on("addEventListener-end",function(t,n){n instanceof m&&"load"===t[0]&&f.emit("xhr-load-added",[t[1],t[2]],n)}),f.on("removeEventListener-end",function(t,n){n instanceof m&&"load"===t[0]&&f.emit("xhr-load-removed",[t[1],t[2]],n)}),f.on("fn-start",function(t,n,e){n instanceof m&&("onload"===e&&(this.onload=!0),("load"===(t[0]&&t[0].type)||this.onload)&&(this.xhrCbStart=a.now()))}),f.on("fn-end",function(t,n){this.xhrCbStart&&f.emit("xhr-cb-time",[a.now()-this.xhrCbStart,this.onload,n],n)})}},{}],11:[function(t,n,e){n.exports=function(t){var n=document.createElement("a"),e=window.location,r={};n.href=t,r.port=n.port;var o=n.href.split("://");!r.port&&o[1]&&(r.port=o[1].split("/")[0].split("@").pop().split(":")[1]),r.port&&"0"!==r.port||(r.port="https"===o[0]?"443":"80"),r.hostname=n.hostname||e.hostname,r.pathname=n.pathname,r.protocol=o[0],"/"!==r.pathname.charAt(0)&&(r.pathname="/"+r.pathname);var i=!n.protocol||":"===n.protocol||n.protocol===e.protocol,a=n.hostname===document.domain&&n.port===e.port;return r.sameOrigin=i&&(!n.hostname||a),r}},{}],12:[function(t,n,e){function r(){}function o(t,n,e){return function(){return i(t,[f.now()].concat(s(arguments)),n?null:this,e),n?void 0:this}}var i=t("handle"),a=t(16),s=t(17),c=t("ee").get("tracer"),f=t("loader"),u=NREUM;"undefined"==typeof window.newrelic&&(newrelic=u);var d=["setPageViewName","setCustomAttribute","setErrorHandler","finished","addToTrace","inlineHit","addRelease"],l="api-",p=l+"ixn-";a(d,function(t,n){u[n]=o(l+n,!0,"api")}),u.addPageAction=o(l+"addPageAction",!0),u.setCurrentRouteName=o(l+"routeName",!0),n.exports=newrelic,u.interaction=function(){return(new r).get()};var h=r.prototype={createTracer:function(t,n){var e={},r=this,o="function"==typeof n;return i(p+"tracer",[f.now(),t,e],r),function(){if(c.emit((o?"":"no-")+"fn-start",[f.now(),r,o],e),o)try{return n.apply(this,arguments)}catch(t){throw c.emit("fn-err",[arguments,this,t],e),t}finally{c.emit("fn-end",[f.now()],e)}}}};a("actionText,setName,setAttribute,save,ignore,onEnd,getContext,end,get".split(","),function(t,n){h[n]=o(p+n)}),newrelic.noticeError=function(t){"string"==typeof t&&(t=new Error(t)),i("err",[t,f.now()])}},{}],13:[function(t,n,e){n.exports=function(t){if("string"==typeof t&&t.length)return t.length;if("object"==typeof t){if("undefined"!=typeof ArrayBuffer&&t instanceof ArrayBuffer&&t.byteLength)return t.byteLength;if("undefined"!=typeof Blob&&t instanceof Blob&&t.size)return t.size;if(!("undefined"!=typeof FormData&&t instanceof FormData))try{return JSON.stringify(t).length}catch(n){return}}}},{}],14:[function(t,n,e){var r=0,o=navigator.userAgent.match(/Firefox[\/\s](\d+\.\d+)/);o&&(r=+o[1]),n.exports=r},{}],15:[function(t,n,e){function r(t,n){if(!o)return!1;if(t!==o)return!1;if(!n)return!0;if(!i)return!1;for(var e=i.split("."),r=n.split("."),a=0;a<r.length;a++)if(r[a]!==e[a])return!1;return!0}var o=null,i=null,a=/Version\/(\S+)\s+Safari/;if(navigator.userAgent){var s=navigator.userAgent,c=s.match(a);c&&s.indexOf("Chrome")===-1&&s.indexOf("Chromium")===-1&&(o="Safari",i=c[1])}n.exports={agent:o,version:i,match:r}},{}],16:[function(t,n,e){function r(t,n){var e=[],r="",i=0;for(r in t)o.call(t,r)&&(e[i]=n(r,t[r]),i+=1);return e}var o=Object.prototype.hasOwnProperty;n.exports=r},{}],17:[function(t,n,e){function r(t,n,e){n||(n=0),"undefined"==typeof e&&(e=t?t.length:0);for(var r=-1,o=e-n||0,i=Array(o<0?0:o);++r<o;)i[r]=t[n+r];return i}n.exports=r},{}],18:[function(t,n,e){n.exports={exists:"undefined"!=typeof window.performance&&window.performance.timing&&"undefined"!=typeof window.performance.timing.navigationStart}},{}],19:[function(t,n,e){function r(t){return!(t&&t instanceof Function&&t.apply&&!t[a])}var o=t("ee"),i=t(17),a="nr@original",s=Object.prototype.hasOwnProperty,c=!1;n.exports=function(t,n){function e(t,n,e,o){function nrWrapper(){var r,a,s,c;try{a=this,r=i(arguments),s="function"==typeof e?e(r,a):e||{}}catch(f){l([f,"",[r,a,o],s])}u(n+"start",[r,a,o],s);try{return c=t.apply(a,r)}catch(d){throw u(n+"err",[r,a,d],s),d}finally{u(n+"end",[r,a,c],s)}}return r(t)?t:(n||(n=""),nrWrapper[a]=t,d(t,nrWrapper),nrWrapper)}function f(t,n,o,i){o||(o="");var a,s,c,f="-"===o.charAt(0);for(c=0;c<n.length;c++)s=n[c],a=t[s],r(a)||(t[s]=e(a,f?s+o:o,i,s))}function u(e,r,o){if(!c||n){var i=c;c=!0;try{t.emit(e,r,o,n)}catch(a){l([a,e,r,o])}c=i}}function d(t,n){if(Object.defineProperty&&Object.keys)try{var e=Object.keys(t);return e.forEach(function(e){Object.defineProperty(n,e,{get:function(){return t[e]},set:function(n){return t[e]=n,n}})}),n}catch(r){l([r])}for(var o in t)s.call(t,o)&&(n[o]=t[o]);return n}function l(n){try{t.emit("internal-error",n)}catch(e){}}return t||(t=o),e.inPlace=f,e.flag=a,e}},{}],ee:[function(t,n,e){function r(){}function o(t){function n(t){return t&&t instanceof r?t:t?c(t,s,i):i()}function e(e,r,o,i){if(!l.aborted||i){t&&t(e,r,o);for(var a=n(o),s=m(e),c=s.length,f=0;f<c;f++)s[f].apply(a,r);var d=u[g[e]];return d&&d.push([b,e,r,a]),a}}function p(t,n){y[t]=m(t).concat(n)}function h(t,n){var e=y[t];if(e)for(var r=0;r<e.length;r++)e[r]===n&&e.splice(r,1)}function m(t){return y[t]||[]}function v(t){return d[t]=d[t]||o(e)}function w(t,n){f(t,function(t,e){n=n||"feature",g[e]=n,n in u||(u[n]=[])})}var y={},g={},b={on:p,addEventListener:p,removeEventListener:h,emit:e,get:v,listeners:m,context:n,buffer:w,abort:a,aborted:!1};return b}function i(){return new r}function a(){(u.api||u.feature)&&(l.aborted=!0,u=l.backlog={})}var s="nr@context",c=t("gos"),f=t(16),u={},d={},l=n.exports=o();l.backlog=u},{}],gos:[function(t,n,e){function r(t,n,e){if(o.call(t,n))return t[n];var r=e();if(Object.defineProperty&&Object.keys)try{return Object.defineProperty(t,n,{value:r,writable:!0,enumerable:!1}),r}catch(i){}return t[n]=r,r}var o=Object.prototype.hasOwnProperty;n.exports=r},{}],handle:[function(t,n,e){function r(t,n,e,r){o.buffer([t],r),o.emit(t,n,e)}var o=t("ee").get("handle");n.exports=r,r.ee=o},{}],id:[function(t,n,e){function r(t){var n=typeof t;return!t||"object"!==n&&"function"!==n?-1:t===window?0:a(t,i,function(){return o++})}var o=1,i="nr@id",a=t("gos");n.exports=r},{}],loader:[function(t,n,e){function r(){if(!E++){var t=x.info=NREUM.info,n=p.getElementsByTagName("script")[0];if(setTimeout(u.abort,3e4),!(t&&t.licenseKey&&t.applicationID&&n))return u.abort();f(g,function(n,e){t[n]||(t[n]=e)}),c("mark",["onload",a()+x.offset],null,"api");var e=p.createElement("script");e.src="https://"+t.agent,n.parentNode.insertBefore(e,n)}}function o(){"complete"===p.readyState&&i()}function i(){c("mark",["domContent",a()+x.offset],null,"api")}function a(){return O.exists&&performance.now?Math.round(performance.now()):(s=Math.max((new Date).getTime(),s))-x.offset}var s=(new Date).getTime(),c=t("handle"),f=t(16),u=t("ee"),d=t(15),l=window,p=l.document,h="addEventListener",m="attachEvent",v=l.XMLHttpRequest,w=v&&v.prototype;NREUM.o={ST:setTimeout,SI:l.setImmediate,CT:clearTimeout,XHR:v,REQ:l.Request,EV:l.Event,PR:l.Promise,MO:l.MutationObserver};var y=""+location,g={beacon:"bam.nr-data.net",errorBeacon:"bam.nr-data.net",agent:"js-agent.newrelic.com/nr-1099.min.js"},b=v&&w&&w[h]&&!/CriOS/.test(navigator.userAgent),x=n.exports={offset:s,now:a,origin:y,features:{},xhrWrappable:b,userAgent:d};t(12),p[h]?(p[h]("DOMContentLoaded",i,!1),l[h]("load",r,!1)):(p[m]("onreadystatechange",o),l[m]("onload",r)),c("mark",["firstbyte",s],null,"api");var E=0,O=t(18)},{}]},{},["loader",2,10,4,3]);
					;NREUM.info={beacon:"bam.nr-data.net",errorBeacon:"bam.nr-data.net",licenseKey:"1a86da48eb",applicationID:"250441256",sa:1}
					</script>

				</head>
				<body>

					<div id="ajax-working"></div>

					<main>
						${this.main ? await this.main() || '' : ''}
					</main>
				</body>
			</html>
		`;
	}
}

router.get('/service-worker.js', API.serve(class extends HTMLAPI {

	async body() {

		this.response.setHeader('Content-Type', 'application/javascript');

		return [
			await (promisify(fs.readFile))('client/js/service-worker.js', {encoding: 'utf8'}),
			`'${this.checksum}'`
		].join('\n');
	}
}));

router.get('/css/custom.css', API.serve(class extends HTMLAPI {

	async body() {

		this.response.setHeader('Content-Type', 'text/css');

		return this.account.settings.get('custom_css') || '';
	}
}));

router.get('/js/custom.js', API.serve(class extends HTMLAPI {

	async body() {

		this.response.setHeader('Content-Type', 'text/javascript');

		return this.account.settings.get('custom_js') || '';
	}
}));

router.get('/account-signup', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/account-signup.css');
		this.scripts.push('/js/account-signup.js');
	}

	async main() {

		return `
			<section class="section" id="signup">
				<h1>Signup Page</h1>

				<div class="toolbar">
					<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
					<button type="submit" form="signup-form"><i class="far fa-save"></i> Sign up</button>
					<span class="notice hidden"></span>
				</div>

				<form class="block form" id="signup-form">

					<h3>Account Details</h3>
					<label>
						<span>Account Name</span>
						<input type="text" name="name" required>
					</label>
					<label>
						<span>Url</span>
						<input type="text" name="url" required>
					</label>
					<label>
						<span>Icon</span>
						<input type="text" name="icon">
					</label>
					<label>
						<span>Logo</span>
						<input type="text" name="logo">
					</label>

					<h3>Admin Details</h3>

					<label>
						<span>First Name</span>
						<input type="text" name="first_name">
					</label>
					<label>
						<span>Middle Name</span>
						<input type="text" name="middle_name">
					</label>
					<label>
						<span>Last Name</span>
						<input type="text" name="last_name">
					</label>
					<label>
						<span>Email</span>
						<input type="email" name="email" required>
					</label>
					<label>
						<span>Password</span>
						<input type="password" name="password" required>
					</label>
					<label>
						<span>Phone</span>
						<input type="text" name="phone">
					</label>
				</form>
			</section>
		`;
	}
}));

router.get('/login', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/login.css');
		this.scripts.push('/js/login.js');
	}

	async main() {

		if(this.request.query.email && this.request.query.password) {
			this.request.body.email = this.request.query.email;
			this.request.body.password = this.request.query.password;
		}

		if((Array.isArray(this.account.settings.get('external_parameters')) && this.request.query.external_parameters) || (this.request.query.email && this.request.query.password)) {

			const external_parameters = {};

			for(const key of this.account.settings.get('external_parameters') || []) {

				if(key in this.request.query)
					this.request.body['ext_' + key] = this.request.query[key];

				external_parameters[key] = this.request.query[key];
			}

			this.request.body.account_id = this.account.account_id;

			const
				loginObj = new authentication.login(this),
				refreshObj = new authentication.refresh(this);

			loginObj.request = this.request;
			refreshObj.request = this.request;

			const response = await loginObj.login();

			if(!response.jwt && response.length)
				throw new Error("User not found!");

			refreshObj.request.body.refresh_token = response.jwt;

			const urlSearchParams = new URLSearchParams();

			urlSearchParams.set('refresh_token', response.jwt);
			urlSearchParams.set('token', await refreshObj.refresh());
			urlSearchParams.set('external_parameters', JSON.stringify(external_parameters));

			this.response.redirect('/dashboard/first/?' + urlSearchParams);

			throw({"pass": true});
		}

		return `
			<div class="logo hidden">
				<img src="" />
			</div>

			<section id="loading" class="section form">
				<i class="fa fa-spinner fa-spin"></i>
			</section>

			<section id="accept-email" class="section">
				<form class="form">

					<label>
						<span>Email</span>
						<input type="email" name="email" required>
					</label>

					<div>
						<a href="/login/forgot">Forgot Password?</a>
						<button class="submit">
							<i class="fas fa-arrow-right"></i>
							Next
						</button>
					</div>
				</form>
			</section>

			<section id="accept-account" class="section"></section>

			<section id="accept-password" class="section">
				<form class="form">

					<label>
						<span>Email</span>
						<input type="email" name="email" disabled required>
					</label>

					<label>
						<span>Password</span>
						<input type="password" name="password" required>
					</label>

					<div>
						<a id="password-back"><i class="fas fa-arrow-left"></i> &nbsp;Back</a>
						<button class="submit">
							<i class="fas fa-sign-in-alt"></i>
							Sign In
						</button>
					</div>
				</form>
			</section>

			<section id="message"></section>

			<div id="signup" class="hidden">
				${this.account.settings.get('enable_account_signup') ? 'Or Create a <a href="/account-signup">new account</a>' : ''}
			</div>
		`;
	}
}));

router.get('/login/forgot', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/login.css');
		this.scripts.push('/js/forgotpassword.js');
	}

	async main() {
		return `

			<div class="logo hidden">
				<img src="" />
			</div>

			<section id="accept-email" class="section show">

				<form class="form forgot">

					<label>
						<span>Email</span>
						<input type="email" name="email" required>
					</label>

					<div>
						<a href='/login'><i class="fa fa-arrow-left"></i> &nbsp;Login</a>
						<button class="submit">
							<i class="fa fa-paper-plane"></i>
							Send Link
						</button>
					</div>
				</form>

			</section>

			<section id="accept-account" class="section"></section>

			<div id="message" class="hidden"></div>
		`;
	}
}));

router.get('/login/reset', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/login.css');
		this.scripts.push('/js/resetpassword.js');
	}

	async main() {
		return `
			<div class="logo hidden">
				<img src="" />
			</div>

			<form class="form reset">

				<label>
					<span>Email</span>
					<input name="email" disabled>
				</label>

				<label>
					<span>New Password</span>
					<input type="password" name="password" required>
				</label>

				<span class="account"></span>

				<div>
					<button class="submit">
						<i class="fa fa-paper-plane"></i>
						Change Password
					</button>
				</div>
			</form>

			<div id="message" class="hidden"></div>
		`;
	}
}));

router.get('/user/settings/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/user/settings.css');
		this.stylesheets.push('/css/settings-manager.css');
		this.scripts.push('/js/user/settings.js');
		this.scripts.push('/js/settings-manager.js');
	}

	async main() {

		return `

			<div class="change-password">
				<h3>Change Password</h3>
				<form class="block form">

					<label>
						<span>Old Password <span class="red">*</span></span>
						<input type="password" name="old_password" required>
					</label>

					<label>
						<span>New Password <span class="red">*</span></span>
						<input type="password" name="new_password" required>
					</label>

					<label>
						<span></span>
						<button class="submit">
							<i class="far fa-save"></i>
							Change
						</button>
					</label>
				</form>
			</div>

			<div class="user-settings">

				<h3>User Settings</h3>

			</div>
		`;
	}
}));

router.get('/user/profile/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/user/profile.css');
		this.scripts.push('/js/reports.js');
		this.scripts.push('/js/user/profile.js');
	}

	async main() {
		return `

			<div class="details">

				<h1>
					<span>&nbsp;</span>
				</h1>
			</div>

			<div class="switch">
				<div class="heading-bar">
					<label class="info selected">
						<h3>Info</h3>
					</label>
					<label class="access">
						<h3>Access</h3>
					</label>
					<label class="activity">
						<h3>Activity</h3>
					</label>
				</div>

				<section class="section show" id="profile-info">
					<div class="spinner">
						<i class="fa fa-spinner fa-spin"></i>
					</div>
				</section>

				<section class="section" id="access">
					<h2>Privileges</h2>
					<p>
						Privileges define what <strong>actions</strong> the user can perform.<br>
						<span class="NA">For Example: Manage Reports, Users, Connections, Dashboards, etc</span>
					</p>
					<table class="privileges">
						<thead>
							<tr>
								<th>Category</th>
								<th>Privilege</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>

					<h2>Roles</h2>
					<p>
						Roles define what <strong>data</strong> the user can view.<br>
						<span class="NA">For Example: <em>Merchant Dashboard</em>, <em>Production MySQL</em> (Connection), <em>Delivery Analysys Report</em> etc</span>
					</p>
					<table class="roles">
						<thead>
							<tr>
								<th>Category</th>
								<th>Role</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section activity-info" id="activity"></section>
			</div>
		`;
	}
}));

router.get('/streams', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.scripts = this.scripts.concat([
			'/js/streams.js',
			'/js/streams-test.js',

			'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
		]);
	}

	async main() {
		return ''
	}
}));

router.get('/:type(dashboard|report|visualization)/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets = this.stylesheets.concat([
			'/css/reports.css',
			'/css/dashboard.css',
		]);

		this.scripts = this.scripts.concat([
			'/js/reports.js',
			'/js/dashboard.js',

			'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',
			'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU&libraries=visualization" defer f="',

			'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
		]);
	}

	async main() {

		return `
			<nav>
				<label class="dashboard-search hidden">
					<input type="search" name="search" placeholder="Search..." >
				</label>

				<div class="dashboard-hierarchy"></div>

				<footer>

					<div class="collapse-panel">
						<span class="left"><i class="fa fa-angle-double-left"></i></span>
					</div>
				</footer>
			</nav>
			<div class="nav-blanket hidden"></div>
			<section class="section" id="list">
				<h2>${this.request.params.type}</h2>

				<form class="form toolbar">

					<label class="right">
						<select name="subtitle">
							<option value="">Everything</option>
						</select>
					</label>
				</form>

				<table class="block">
					<thead></thead>
					<tbody></tbody>
				</table>
			</section>

			<section class="section" id="reports">

				<h1 class="dashboard-name"></h1>

				<div class="toolbar form hidden">

					<button id="back">
						<i class="fa fa-arrow-left"></i>
						Back
					</button>

					<button id="edit-dashboard" class="hidden">
						<i class="fa fa-edit"></i>
						Edit
					</button>

					<button id="mailto" class="hidden">
						<i class="fas fa-envelope"></i>
						Email
					</button>

					<button id="configure" class="hidden">
						<i class="fas fa-cog"></i>
						Configure
					</button>

					<button id="share">
						<i class="fas fa-share"></i>
						Share
					</button>

					<div class="download">
						<button>
							<i class="fas fa-download"></i>
							Download
						</button>
						<div class="options hidden">
							<span class="item pdf">
								<i class="far fa-file-pdf"></i>
								<div>
									PDF&nbsp;
									<span class="NA">BETA</span>
								</div>
							</span>
							<span class="item png">
								<i class="far fa-image"></i>
								PNG
							</span>
							<span class="item jpeg">
								<i class="far fa-file-image"></i>
								JPEG
							</span>
						</div>
					</div>

					<button id="full-screen">
						<i class="fas fa-expand"></i>
						Full Screen
					</button>
				</div>

				<form class="form mailto-content hidden">
					<label>
						<span>Send to</span>
						<input type="email" name="email">
					</label>
					<label>
						<span>Subject</span>
						<input type="text" name="subject">
					</label>
					<label>
						<span>Body</span>
						<input type="text" name="body">
					</label>
					<button type="submit"><i class="fa fa-paper-plane"></i> Send</button>
				</form>
				<div class="global-filters form"></div>

				<div class="list"></div>
				<div id="blanket" class="hidden"></div>
				<button type="button" class="side">
					<i class="fas fa-filter"></i>
				</button>
			</section>
		`;
	}
}));

router.get('/dashboards-manager/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets = this.stylesheets.concat([
			'/css/reports.css',
			'/css/dashboards-manager.css',
		]);

		this.scripts = this.scripts.concat([
			'/js/reports.js',
			'/js/dashboards-manager.js'
		]);
	}

	async main() {
		return `
			<section class="section" id="list">

				<div class="heading">
					<button id="add-dashboard" type="button" class="grey">
						<i class="fa fa-plus"></i>
					</button>
					<h1>Manage Dashboards</h1>
				</div>

				<div class="dashboards"></div>
			</section>

			<section class="section" id="form">
				<h1></h1>

				<div class="toolbar">
					<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
					<button type="submit" form="dashboard-form"><i class="far fa-save"></i> Save</button>
				</div>

				<form class="block form" id="dashboard-form">

					<label>
						<span>Name <span class="red">*</span></span>
						<input type="text" name="name" required>
					</label>

					<label class="parent-dashboard">
						<span>Parent</span>
					</label>

					<label>
						<span>Icon</span>
						<input type="text" name="icon">
					</label>

					<label>
						<span>Order</span>
						<input type="number" min="0" step="1" name="order">
					</label>

					<label id="format">
						<span>Format</span>
					</label>
				</form>

				<h2 class="share-heading">Share dashboards</h2>
				<div id="share-dashboards"></div>
			</section>
		`;
	}
}));

router.get('/reports/:stage?/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets = this.stylesheets.concat([
			'/css/reports.css',
			'/css/reports-manager.css',
		]);

		this.scripts = this.scripts.concat([
			'/js/reports.js',
			'/js/reports-manager.js',

			'https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ext-language_tools.js',

			'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',
			'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU&libraries=visualization" defer f="',

			'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
			'https://devpreview.tiny.cloud/demo/tinymce.min.js',
		]);
	}

	async main() {
		return `
			<div id="stage-switcher"></div>

			<div id="stages">
				<section class="section" id="stage-pick-report">

					<form class="toolbar filters">

						<button type="button" class="grey" id="add-report">
							<i class="fa fa-plus"></i>
							Add New Report
						</button>
					</form>

					<div id="list-container">
						<table>
							<thead>
								<tr class="search"></tr>
								<tr>
									<th class="sort search" data-key="query_id">ID</th>
									<th class="sort search" data-key="name" >Name</th>
									<th class="sort search" data-key="connection">Connection </th>
									<th class="sort search" data-key="tags">Tags</th>
									<th class="sort search" data-key="filters">Filters</th>
									<th class="sort search" data-key="visualizations">Visualizations</th>
									<th class="sort search" data-key="is_enabled">Enabled</th>
									<th class="action">Configue</th>
									<th class="action">Define</th>
									<th class="action">Delete</th>
								</tr>
							</thead>
							<tbody></tbody>
						</table>
					</div>
				</section>

				<section class="section" id="stage-configure-report">

					<header class="toolbar">
						<button type="submit" form="configure-report-form"><i class="far fa-save"></i> Save</button>
						<small id="added-by"></small>
					</header>

					<form id="configure-report-form">

						<div class="form">
							<label>
								<span>Name <span class="red">*</span></span>
								<input type="text" name="name" required>
							</label>

							<label>
								<span>Connection <span class="red">*</span></span>
								<select name="connection_name" required></select>
							</label>

							<label>
								<span>Tags <span class="right NA">Comma Separated</span></span>
								<input type="text" name="tags">
							</label>

							<label>
								<span>Category</span>
								<select name="subtitle"></select>
							</label>
						</div>

						<div class="form">

							<label>
								<span>Refresh Rate <span class="right NA">Seconds</span></span>
								<input type="number" name="refresh_rate" min="0" step="1">
							</label>

							<label>
								<span>Store Result</span>
								<select name="load_saved">
									<option value="1">Enabled</option>
									<option value="0" selected>Disabled</option>
								</select>
							</label>

							<label>
								<span>Redis <span class="right NA">Seconds</span></span>

								<select id="redis">
									<option value="0">Disabled</option>
									<option value="EOD">EOD</option>
									<option value="custom">Custom<custom>
								</select>

								<input type="number" min="1" step="1" name="redis_custom" class="hidden" placeholder="Seconds">
							</label>

							<label>
								<span>Status</span>
								<select name="is_enabled" required>
									<option value="1">Enabled</option>
									<option value="0">Disabled</option>
								</select>
							</label>
						</div>

						<div class="form description">
							<span>Description</span>
						</div>
					</form>

					<h2>Share Report</h2>
					<div id="share-report"></div>
				</section>

				<section class="section" id="stage-define-report">

					<header class="toolbar">
						<div id="save-container">
							<button type="submit" form="define-report-form"><i class="far fa-save"></i> Save</button>
							<button id="save-more"><i class="fa fa-angle-down"></i></button>
							<div id="save-menu" class="hidden">
								<button id="fork"><i class="fas fa-code-branch"></i> Fork</button>
							</div>
						</div>
						<button id="schema-toggle" class="hidden"><i class="fas fa-database"></i> Schema</button>
						<button id="filters-toggle"><i class="fas fa-filter"></i> Filters</button>
						<button id="preview-toggle"><i class="fas fa-eye"></i> Preview</button>
						<button id="edit-data-toggle"><i class="fas fa-edit"></i> Edit Data</button>
						<button id="run"><i class="fas fa-sync"></i> Run</button>
						<button id="history-toggle"><i class="fa fa-history"></i> History</button>
					</header>

					<div id="define-report-parts">
						<div id="schema" class="hidden"></div>
						<form id="define-report-form"></form>
					</div>
				</section>

				<section class="section" id="stage-pick-visualization">

					<div id="visualization-list">

						<div class="toolbar">
							<button id="add-visualization" class="grey"><i class="fas fa-plus"></i> Add New Visualization</button></button>
						</div>

						<table>
							<thead>
								<tr>
									<th>Name</th>
									<th>Type</th>
									<th>Preview</th>
									<th>Edit</th>
									<th>Delete</th>
								</tr>
							</thead>
							<tbody></tbody>
						</table>
					</div>

					<div class="hidden" id="add-visualization-picker">

						<div class="toolbar">
							<button id="visualization-picker-back"><i class="fas fa-arrow-left"></i> Back</button>
						</div>

						<form id="add-visualization-form"></form>
					</div>

				</section>

				<section class="section" id="stage-configure-visualization">

					<div class="toolbar">
						<button type="button" id="configure-visualization-back"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="configure-visualization-form" class="right"><i class="far fa-save"></i> Save</button>
						<button type="button" id="preview-configure-visualization"><i class="fa fa-eye"></i> Preview</button>
						<button type="button" id="history-configure-visualization"><i class="fa fa-history"></i> History</button>
					</div>

				</section>
			</div>

			<div id="preview" class="hidden"></div>
		`;
	}
}));

router.get('/visualizations-manager/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/visualizations-manager.css');
		this.scripts.push('/js/reports.js');
		this.scripts.push('/js/visualizations-manager.js');
	}
}));

router.get('/users-manager/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/users-manager.css');
		this.scripts.push('/js/users-manager.js');
	}

	async main() {
		return `
			<section class="section" id="list">

				<h1>Manage Users</h1>

				<header class="toolbar">
					<button id="add-user" class="grey"><i class="fa fa-plus"></i> Add New User</button>
				</header>

                <form class="user-search block form">

                    <label>
                        <span>Id</span>
                        <input type="number" name="user_id" step="1" min="0">
                    </label>

                    <label>
                        <span>Name</span>
                        <input type="text" name="name">
                    </label>

                    <label>
                        <span>Email</span>
                        <input type="text" name="email">
                    </label>

                    <label>
                        <span>Search by</span>
                        <select name="search_by" value="category">
                            <option value="category">Category</option>
                            <option value="role">Role</option>
                            <option value="privilege">Privilege</option>
                        </select>
                    </label>

                    <label class="category">
                        <span>Category</span>
                    </label>

                    <label class="hidden role">
                        <span>Role</span>
                    </label>

                    <label class="hidden privilege">
                        <span>Privilege</span>
                    </label>

                    <label>
                        <span></span>
                        <button type="submit">Apply</button>
                    </label>
                </form>

				<table class="block">
					<thead>
						<tr class="search-bar"></tr>
						<tr class="thead-bar">
							<th data-key="id" class="thin">ID</th>
							<th data-key="name">Name</th>
							<th data-key="email">Email</th>
							<th data-key="lastLogin">Last Login</th>
							<th class="action">Edit</th>
							<th class="action">Delete</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</section>

			<section class="section" id="form">

				<h1></h1>

				<header class="toolbar">
					<button id="cancel-form"><i class="fa fa-arrow-left"></i> Back</button>
					<button type="submit" form="user-form"><i class="far fa-save"></i> Save</button>
				</header>

				<form class="block form" id="user-form">

					<label>
						<span>Fist Name <span class="red">*</span></span>
						<input type="text" name="first_name" required>
					</label>

					<label>
						<span>Middle Name</span>
						<input type="text" name="middle_name">
					</label>

					<label>
						<span>Last Name</span>
						<input type="text" name="last_name">
					</label>

					<label>
						<span>Email <span class="red">*</span></span>
						<input type="email" name="email" required>
					</label>

					<label>
						<span>Password</span>
						<input type="password" name="password">
					</label>
				</form>

				<div class="privileges form-container">
					<h3>Privileges</h3>
					<form class="filter">
						<label><span>Category</span></label>
						<label><span>Privileges</span></label>
						<label class="edit"><span></span></label>
						<label class="save"><span></span></label>
					</form>

					<div id="filters-list"></div>

					<form id="add-filter" class="filter">

						<label>
							<select name="category_id"></select>
						</label>

						<label>
							<select name="privilege_id"></select>
						</label>

						<label class="save">
							<button type="submit" title="Add"><i class="fa fa-paper-plane"></i></button>
						</label>
					</form>
				</div>

				<h3>Roles</h3>

				<div class="roles form-container">
				</div>

			</section>
		`;
	}
}));

router.get('/connections-manager/:id?/:type?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/connections-manager.css');
		this.scripts.push('/js/connections-manager.js');
	}

	async main() {
		return `

			<section class="section" id="list">

				<h1>OAuth Connections</h1>

				<div class="oauth-connections">

					<div class="test-result hidden"></div>

					<table class="block">
						<thead>
							<tr>
								<th class="thin">ID</th>
								<th>Name</th>
								<th>Type</th>
								<th class="action">Authenticate</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>

					<form id="add-oauth-connection" class="form">
						<select name="provider"></select>
						<button type="submit">
							<i class="fas fa-plus"></i> Add New Connection
						</button>
					</form>
				</div>

			</section>

			<section class="section" id="add-connection">

				<h1>Add New Connection</h1>

				<div id="add-connection-picker">

					<div class="toolbar">
						<button id="connection-picker-back"><i class="fas fa-arrow-left"></i> Back</button>
					</div>

					<form id="add-connection-form"></form>
				</div>
			</section>

			<section class="section" id="form">

				<h1></h1>

				<header class="toolbar">
					<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
					<button type="submit" form="connections-form"><i class="far fa-save"></i> Save</button>
					<button type="button" id="test-connection"><i class="fas fa-flask"></i>Test</button>
				</header>

				<div class="test-result hidden"></div>

				<form class="block form" id="connections-form">

					<label>
						<span>Name <span class="red">*</span></span>
						<input type="text" name="connection_name" required>
					</label>

					<div id="details"></div>
				</form>

				<h2 class="share-heading">Share connections</h2>
				<div id="share-connections"></div>
			</section>
		`;
	}
}));

router.get('/settings/:tab?/:id?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/settings.css');
		this.stylesheets.push('/css/settings-manager.css');
		this.scripts.push('/js/reports.js');
		this.scripts.push('/js/settings.js');
		this.scripts.push('/js/settings-manager.js');
	}

	async main() {
		return `
			<nav></nav>

			<div class="setting-page accounts-page hidden">

				<section class="section" id="accounts-list">

					<h1>Manage Accounts</h1>

					<header class="toolbar">
						<button id="add-account"><i class="fa fa-plus"></i> Add New Account</button>
					</header>

					<table class="block">
						<thead>
							<th>Id</th>
							<th>Name</th>
							<th>URL</th>
							<th>Icon</th>
							<th>Logo</th>
							<th>Edit</th>
							<th>Delete</th>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="accounts-form">

					<h1></h1>

					<header class="toolbar">
						<button id="cancel-form"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="account-form"><i class="far fa-save"></i> Save</button>
					</header>

					<form class="block form" id="account-form">

						<label>
							<span>Name <span class="red">*</span></span>
							<input type="text" name="name" required>
						</label>

						<label>
							<span>URL <span class="red">*</span></span>
							<input type="text" name="url" required>
						</label>

						<label>
							<span>Icon</span>
							<input type="url" name="icon">
							<img src="" alt="icon" id="icon" height="30">
						</label>

						<label>
							<span>Logo</span>
							<input type="url" name="logo">
							<img src="" alt="logo" id="logo" height="30">
						</label>

						<label>
							<span>Authentication API</span>
							<input type="url" name="auth_api">
						</label>
					</form>
				</section>
			</div>

			<div class="setting-page global-filters-page hidden">
				<section class="section" id="global-filters-list">

					<h1>Manage Global Filters</h1>

					<header class="toolbar">
						<button id="add-global-filter"><i class="fa fa-plus"></i> Add New Global Filter</button>
					</header>

					<table class="block">
						<thead>
							<tr>
								<th>ID</th>
								<th>Name</th>
								<th>Placeholder</th>
								<th>Type</th>
								<th>Default Value</th>
								<th>Multiple</th>
								<th>Offset</th>
								<th>Dataset</th>
								<th class="action">Edit</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="global-filters-form">

					<h1></h1>

					<header class="toolbar">
						<button id="cancel-form"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="user-form"><i class="far fa-save"></i> Save</button>
					</header>

					<form class="block form" id="user-form">

						<label>
							<span>Name <span class="red">*</span></span>
							<input type="text" name="name" required>
						</label>

						<label>
							<span>Placeholder <span class="red">*</span><span class="right" data-tooltip="Uniquely identifies the filter in this report.">?</span></span>
							<input type="text" name="placeholder" required>
						</label>

						<label>
							<span>Type <span class="red">*</span></span>
							<select name="type" required></select>
						</label>

						<label>
							<span>Description</span>
							<input type="text" name="description" maxlength="200">
						</label>

						<label>
							<span>Order</span>
							<input type="number" name="order">
						</label>

						<label>
							<span>Default Value <span class="right" data-tooltip="Calculated and applied on first load\nif a global filter with same placeholder isn't added.">?</span></span>
							<select name="default_type">
								<option value="none">None</option>
								<option value="default_value">Fixed</option>
								<option value="offset">Relative</option>
							</select>

							<input type="text" name="default_value">

							<input type="number" name="offset">
						</label>

						<label class="datasets">
							<span>Dataset <span class="right" data-tooltip="A set of possible values for this filter.">?</span></span>
						</label>

						<label>
							<span>Multiple <span class="right" data-tooltip="Can the user pick multiple values.">?</span></span>
							<select name="multiple">
								<option value="0">No</option>
								<option value="1">Yes</option>
							</select>
						</label>
					</form>
				</section>
			</div>

			<div class="setting-page privilege-page hidden">

				<section class="section" id="privileges-list">

					<h1>Manage Privileges</h1>

					<header class="toolbar">
						<button id="add-privilege"><i class="fa fa-plus"></i> Add New Privilege</button>
					</header>

					<table class="block">
						<thead>
							<tr>
								<th>ID</th>
								<th>Name</th>
								<th>Is Admin</th>
								<th class="action">Edit</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="privileges-form">

					<h1></h1>

					<header class="toolbar">
						<button id="cancel-form"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="user-form2"><i class="far fa-save"></i> Save</button>
					</header>

					<form class="block form" id="user-form2">

						<label>
							<span>Name <span class="red">*</span></span>
							<input type="text" name="name" required>
						</label>

						<label>
							<span>Is Admin <span class="red">*</span></span>
							<select name="is_admin" required>
								<option value="1">Yes</option>
								<option value="0">No</option>
							</select>
						</label>
					</form>
				</section>
			</div>

			<div class="setting-page roles-page hidden">

				<section class="section" id="roles-list">

					<h1>Manage Roles</h1>

					<header class="toolbar">
						<button id="add-role"><i class="fa fa-plus"></i> Add New Role</button>
					</header>

					<table class="block">
						<thead>
							<tr>
								<th class="thin">ID</th>
								<th>Name</th>
								<th>Admin</th>
								<th class="action">Edit</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="roles-form">

					<h1></h1>

					<header class="toolbar">
						<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="role-form"><i class="far fa-save"></i> Save</button>
					</header>

					<form class="block form" id="role-form">

						<label>
							<span>Name <span class="red">*</span></span>
							<input type="text" name="name" required>
						</label>

						<label>
							<span>Admin <span class="red">*</span></span>
							<select  name="is_admin" required>
								<option value="1">Yes</option>
								<option value="0">No</option>
							</select>
						</label>
					</form>
				</section>
			</div>

			<div class="setting-page category-page hidden">

				<section class="section" id="category-list">

					<h1>Manage Categories</h1>

					<header class="toolbar">
						<button id="add-category"><i class="fa fa-plus"></i> Add New Category</button>
					</header>

					<table class="block">
						<thead>
							<tr>
								<th class="thin">ID</th>
								<th>Name</th>
								<th>Slug</th>
								<th>Parent</th>
								<th>Admin</th>
								<th class="action">Edit</th>
								<th class="action">Delete</th>
							</tr>
						</thead>
						<tbody></tbody>
					</table>
				</section>

				<section class="section" id="category-edit">

					<h1></h1>

					<header class="toolbar">
						<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
						<button type="submit" form="category-form"><i class="far fa-save"></i> Save</button>
					</header>

					<form class="block form" id="category-form">

						<label>
							<span>Name <span class="red">*</span></span>
							<input type="text" name="name" required>
						</label>

						<label>
							<span>Slug <span class="red">*</span></span>
							<input type="text" name="slug" required>
						</label>

						<label>
							<span>Parent</span>
							<input type="number" name="parent">
						</label>

						<label>
							<span>Admin <span class="red">*</span></span>
							<select name="is_admin" required>
								<option value="1">Yes</option>
								<option value="0">No</option>
							</select>
						</label>
					</form>
				</section>
			</div>

			<div class="setting-page about-page hidden">
				<section class="section about-list" id="about"></section>
			</div>
		`;
	}
}));

router.get('/tasks/:id?/:define?', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/tasks.css');
		this.scripts.push('/js/tasks.js');
	}

	main() {

		return `
			<section class="section" id="list">
				<h1>Tasks</h1>

				<header class="toolbar">
					<button id="add-task"><i class="fas fa-plus"></i> Add New Task</button>
				</header>

				<table class="block">
					<thead>
						<tr>
							<th>ID</th>
							<th>Name</th>
							<th>Type</th>
							<th class="action">Define</th>
							<th class="action">Edit</th>
							<th class="action">Delete</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</section>

			<section class="section" id="form">

				<h1></h1>

				<header class="toolbar">
					<button id="form-back"><i class="fas fa-arrow-left"></i> Back</button>
					<button type="submit" form="task-form"><i class="far fa-save"></i> Save</button>
				</header>

				<form class="form block" id="task-form">

					<label>
						<span>Task Name</span>
						<input type="text" name="name" required>
					</label>

					<label>
						<span>Task Type</span>
						<select name="type" required>
							<option value="google-analytics">Google Analytics</option>
						</select>
					</label>
				</form>
			</section>

			<section class="section" id="define">

				<header class="toolbar">
					<button id="define-back"><i class="fas fa-arrow-left"></i> Back</button>
					<button type="submit" form="task-define"><i class="far fa-save"></i> Save</button>
				</header>
			</section>
		`;
	}
}));

router.get('/tests', API.serve(class extends HTMLAPI {

	constructor() {

		super();

		this.stylesheets.push('/css/tests.css');

		this.scripts = this.scripts.concat([

			'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',
			'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU&libraries=visualization" defer f="',

			'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',

			'/js/reports.js',
			'/js/user/profile.js',
			'/js/settings-manager.js',
			'/js/tests.js',
		]);
	}

	main() {

		if(!this.user || this.environment.name.includes('production') || this.environment.name.includes('staging'))
			throw new API.Exception(401, 'Tests cannot run on production database');

		this.user.privilege.needs('superadmin');

		return `

			<section class="section" id="list">

				<h1>Tests</h1>

				<header class="toolbar">
					<button id="run"><i class="fas fa-check"></i> Run</button>

					<div id="progress">
						<meter min="0"></meter>
						<span class="NA"></span>
					</div>
				</header>

				<div id="tests"></div>
			</section>
		`;
	}
}));

module.exports = router;