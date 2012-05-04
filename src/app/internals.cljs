(ns internals)

(def $ (js/$))
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
                      (render-internal (.substring h 1) nil)
                      )))

     (.each ($ ".link-internal")
            (fn [i e] 
              (let [j-e ($ e)
                    target (.attr j-e "target_internal")
                    target-container (.attr j-e "target_container")]
                (if target
                  (.click j-e (fn []
                                (render-internal target target_container)))))))
     ))


