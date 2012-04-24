(ns server
  (:require 
    [render :as r]
    [util :as util]
    [cljs.nodejs :as node]))

;(println (js-obj {:a 3 :b 4}))

(def express (node/require "express"))

(defn configure-server [app]
  (.use app (. app -routes))
;  (.use app (js* "require(\"express\").static(\"public\")"))
;  (.configure 
;    app
;    (.use app (. app -routes))
    ;(.use app (.static express "public"))
;    )
)

(defn init-routes [app]
  (doto app
    (.get "/page/:name" (fn [req res]
                          (.send res (r/render-page :index))
                          ))))

(defn start-server []
  (let [app (.createServer express)]
;    (.get app "/index" (fn [req res] (.send res "hello")))
    (configure-server app)
    (init-routes app)
    (r/init-env)
    (r/get-env)
    (.listen app 8080) ;(fn [] (println "Express server listening on port " (. (.address app) -port) 
                      ;                " in mode " (. (. app -settings) -env))))
    ))

(set! *main-cli-fn* start-server)
