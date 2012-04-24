goog.provide('server');
goog.require('cljs.core');
goog.require('render');
goog.require('util');
goog.require('cljs.nodejs');
server.express = cljs.nodejs.require.call(null,"express");
server.configure_server = (function configure_server(app){
return app.use(app.routes);
});
server.init_routes = (function init_routes(app){
var G__158984__158985 = app;
G__158984__158985.get("/page/:name",(function (req,res){
return res.send(render.render_page.call(null,"\uFDD0'index"));
}));
return G__158984__158985;
});
server.start_server = (function start_server(){
var app__158986 = server.express.createServer();
server.configure_server.call(null,app__158986);
server.init_routes.call(null,app__158986);
render.init_env.call(null);
render.get_env.call(null);
return app__158986.listen(8080);
});
cljs.core._STAR_main_cli_fn_STAR_ = server.start_server;
