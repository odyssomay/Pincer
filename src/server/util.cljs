(ns util)

(defn ends-with [string suffix]
  (not= (.indexOf string suffix (- (count string) (count suffix)))
        -1))

; taken from http://mmcgrana.github.com/2011/09/clojurescript-nodejs.html
(defn clj->js
  "Recursively transforms ClojureScript maps into Javascript objects,
  other ClojureScript colls into JavaScript arrays, and ClojureScript
  keywords into JavaScript strings."
  [x]
  (cond
    (string? x) x
    (keyword? x) (name x)
    (map? x) (.-strobj (reduce (fn [m [k v]]
                                (assoc m (clj->js k) (clj->js v))) {} x))
    (coll? x) (apply array (map clj->js x))
    :else x))

(defn map->js [m]
  (let [obj (js* "{}")]
    (doseq [[k v] m]
      (aset obj (name k) v))
    obj))

