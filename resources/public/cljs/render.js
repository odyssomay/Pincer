goog.provide('render');
goog.require('cljs.core');
goog.require('cljs.nodejs');
goog.require('util');
render.fs = cljs.nodejs.require.call(null,"fs");
render.whiskers = cljs.nodejs.require.call(null,"whiskers");
render.pages = cljs.core.atom.call(null,cljs.core.PersistentHashMap.fromArrays([],[]));
render.partials = cljs.core.atom.call(null,cljs.core.PersistentHashMap.fromArrays([],[]));
render.get_dir_file_content = (function get_dir_file_content(dir){
var filenames__160568 = render.fs.readdirSync(dir);
return cljs.core.into.call(null,cljs.core.PersistentHashMap.fromArrays([],[]),cljs.core.map.call(null,(function (dirname){
if(cljs.core.truth_(util.ends_with.call(null,dirname,".html")))
{return cljs.core.PersistentVector.fromArray([cljs.core.keyword.call(null,dirname.replace(".html","")),render.fs.readFileSync(cljs.core.str.call(null,dir,dirname))]);
} else
{return null;
}
}),filenames__160568));
});
render.reload_pages = (function reload_pages(){
return cljs.core.reset_BANG_.call(null,render.pages,render.get_dir_file_content.call(null,"views/"));
});
render.reload_partials = (function reload_partials(){
return cljs.core.reset_BANG_.call(null,render.partials,render.get_dir_file_content.call(null,"partials/"));
});
render.get_env = (function get_env(env){
var merged_env__160569 = cljs.core.assoc.call(null,cljs.core.merge.call(null,cljs.core.PersistentHashMap.fromArrays([],[]),env),"\uFDD0'partials",util.map__GT_js.call(null,cljs.core.deref.call(null,render.partials)));
return util.map__GT_js.call(null,merged_env__160569);
});
render.init_env = (function init_env(){
render.reload_pages.call(null);
render.reload_partials.call(null);
render.fs.watch("views/",(function (){
cljs.core.println.call(null,"reloading pages");
return render.reload_pages.call(null);
}));
return render.fs.watch("partials/",(function (){
cljs.core.println.call(null,"reloading partials");
return render.reload_partials.call(null);
}));
});
render.render_page = (function render_page(page){
var page_content__160570 = cljs.core.get.call(null,cljs.core.deref.call(null,render.pages),page,null);
var env__160571 = render.get_env.call(null,render.env);
if(cljs.core.not.call(null,page_content__160570))
{cljs.core.println.call(null,"WARNING: page ",page," does not exist");
} else
{}
return render.whiskers.render(page_content__160570,env__160571);
});
