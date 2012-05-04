(ns index)

(js/$ (fn []
        (.click (js/$ "#test-button") 
                (fn []
                  (.slideToggle (js/$ "#test-hidden-content") 200)))))
