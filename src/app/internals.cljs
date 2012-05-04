(ns internals)

(js/$ (fn []
        (.each (js/$ ".link-internal")
               (fn [i e] 
                 (let [j-e (js/$ e)
                       target (.attr j-e "target_internal")
                       target-container (.attr j-e "target_container")]
                   (if target
                     (.click j-e (fn []
                                   (let [c (if target-container target-container "internals-container")
                                         j-c (js/$ (str "#" c))]
                                     (.get js/$ (str "/internal/" target)
                                           (fn [data]
                                             (doto j-c
                                               (.empty)
                                               (.append data)))))))))))))


