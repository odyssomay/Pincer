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
var G__162153__162154 = app;
G__162153__162154.get("/page/:name",(function (req,res){
return res.send(render.render_page.call(null,cljs.core.keyword.call(null,req.params.name)));
}));
return G__162153__162154;
});
server.start_server = (function start_server(){
var app__162155 = server.express.createServer();
server.configure_server.call(null,app__162155);
server.init_routes.call(null,app__162155);
render.init_env.call(null);
render.get_env.call(null);
return app__162155.listen(8080);
});
cljs.core._STAR_main_cli_fn_STAR_ = server.start_server;
