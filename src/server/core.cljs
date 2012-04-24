(ns server
  (:require [cljs.nodejs :as node]))

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

                          ))))

(defn start-server []
  (let [app (.createServer express)]
;    (.get app "/index" (fn [req res] (.send res "hello")))
    (configure-server app)
    (.listen app 8080) ;(fn [] (println "Express server listening on port " (. (.address app) -port) 
                      ;                " in mode " (. (. app -settings) -env))))
    ))

(set! *main-cli-fn* start-server)
