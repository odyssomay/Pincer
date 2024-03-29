(ns internals)

(def on-internal-load-fns 
  (atom {}))

(defn on-internal-load [name f]
  (swap! on-internal-load-fns assoc (keyword name) f))

(defn trigger-on-internal-load [name]
  (let [f (get @on-internal-load-fns (keyword name) (fn []))]
    (f)))

(def $ (js* "$"))
(def window (js* "window"))

(defn render-internal [internal container]
  (let [c (if container container "internals-container")
        j-c ($ (str "#" c))]
    (.get $ (str "/internal/" internal)
          (fn [data]
            (doto j-c
              (.empty)
              (.hide)
              (.append data)
              (.fadeIn 50)
              )))))

($ (fn []
     (.hashchange ($ window)
                  (fn [] 
                    (let [h (.-hash (.-location window))]
                      (if-not (= h "")
                        (render-internal (.substring h 1) nil)))))
     (.hashchange ($ window))

     (.each ($ ".link-internal")
            (fn [i e] 
              (let [j-e ($ e)
                    target (.attr j-e "target_internal")
                    target-container (.attr j-e "target_container")]
                (if target
                  (.click j-e (fn []
                                (render-internal target target_container)))))))
     ))


