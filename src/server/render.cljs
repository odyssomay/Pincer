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

(defn fill-atom-with-dir-content [dir atom]
  (let [reload-fn (fn [] (println "reloading" dir)
                   (reset! atom (get-dir-file-content dir)))]
    (reload-fn)
    (.watch fs dir reload-fn))) 

(defn create-dir-map [dir ending f]
  (let [filenames (.readdirSync fs dir)
        m (into {} (map (fn [filename]
                          (if (u/ends-with filename ending)
                            [(keyword (.replace filename ending ""))
                             (f filename)]))
                        filenames))]
    m))

(defn get-app-js-import-map []
  (let [m (create-dir-map "public/js/app/" ".js"
                          (fn [filename]
                            (str "<script type=\"text/javascript\" src=\"/js/app/" filename  
                                 "\"></script>
                                 <script type=\"text/javascript\">
                                 goog.require('" (.replace filename ".js" "") "');</script>")))]
    (merge m {:init "<script type=\"text/javascript\" src=\"/js/app/out/goog/base.js\"></script>"})))

(defn get-js-import-map []
  (create-dir-map "public/js/" ".js"
                  (fn [filename]
                    (str "<script type=\"text/javascript\" src=\"/js/" filename "\"></script>"))))

(defn get-css-import-map []
  (create-dir-map "public/css/" ".css"
                  (fn [filename]
                    (str "<link rel=\"stylesheet\" type=\"text/css\" href=\"/css/"
                         filename
                         "\" media=\"screen\" />")))) 

(let [js-import-obj (u/map->js (get-js-import-map))
      js-app-import-obj (u/map->js (get-app-js-import-map))
      css-obj (u/map->js (get-css-import-map))] 
  (defn get-env [env]
    (let [merged-env
          (-> {:partials (u/map->js @partials)
               :css css-obj
               :app js-app-import-obj
               :js js-import-obj}
            (merge env))]
      (u/map->js merged-env))))

(defn init-env []
  (fill-atom-with-dir-content "views/" pages)
  (fill-atom-with-dir-content "partials/" partials))

(defn render-page [page]
  (let [page-content (get @pages page nil)
        env (get-env env)]
    (if-not page-content (println "WARNING: page" page "does not exist"))
    (.render whiskers page-content env)))

