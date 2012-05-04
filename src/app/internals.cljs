(ns internals)

(def $ (js/$))

(defn render-internal [internal container]
  (let [c (if container container "internals-container")
        j-c (js/$ (str "#" c))]
    (.get js/$ (str "/internal/" internal)
          (fn [data]
            (doto j-c
              (.empty)
              (.hide)
              (.append data)
              (.fadeIn 50)
              )))))

($ (fn []
     (.hashchange ($ js/window)
                  (fn [] 
                    (let [h (.-hash (.-location window))]
                      (render-internal (.substring h 1) nil)
                      )))

     (.each (js/$ ".link-internal")
            (fn [i e] 
              (let [j-e (js/$ e)
                    target (.attr j-e "target_internal")
                    target-container (.attr j-e "target_container")]
                (if target
                  (.click j-e (fn []
                                (render-internal target target_container)))))))
     ))


