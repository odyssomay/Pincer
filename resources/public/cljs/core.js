goog.provide('server');
goog.require('cljs.core');
goog.require('cljs.nodejs');
server.express = cljs.nodejs.require.call(null,"express");
server.configure_server = (function configure_server(app){
return app.use(app.routes);
});
server.init_routes = (function init_routes(app){
var G__3526__3527 = app;
G__3526__3527.get("/page/:name",(function (req,res){
return null;
}));
return G__3526__3527;
});
server.start_server = (function start_server(){
var app__3528 = server.express.createServer();
server.configure_server.call(null,app__3528);
return app__3528.listen(8080);
});
cljs.core._STAR_main_cli_fn_STAR_ = server.start_server;
