(ns render
  (:require [cljs.nodejs :as node]
            [util :as u]))

(def fs (node/require "fs"))
(def whiskers (node/require "whiskers"))

(def pages (atom {}))
(def partials (atom {}))

(defn get-dir-file-content [dir]
  (let [filenames (.readdirSync fs dir)]
    (into {} (map (fn [dirname]
                    (if (u/ends-with dirname ".html")
                      [(keyword (.replace dirname ".html" "")) (.readFileSync fs (str dir dirname))])) 
                  filenames))))

(defn reload-pages []
  (reset! pages (get-dir-file-content "views/")))

(defn reload-partials []
  (reset! partials (get-dir-file-content "partials/")))

(defn get-env [env]
  (let [merged-env
        (-> {}
          (merge env)
          (assoc :partials (u/map->js @partials)))]
    (u/map->js merged-env)))

(defn init-env []
  (reload-pages)
  (reload-partials)
  (.watch fs "views/" (fn [] (println "reloading pages") (reload-pages)))
  (.watch fs "partials/" (fn [] (println "reloading partials") (reload-partials)))
  )

(defn render-page [page]
  (let [page-content (get @pages page nil)
        env (get-env env)]
    (if-not page-content (println "WARNING: page" page "does not exist"))
    (.render whiskers page-content env)))

