(ns index)

(def $ (js* "jQuery"))

($ (fn []
     (.click ($ "#test-button") 
             (fn []
               (.slideToggle ($ "#test-hidden-content") 200)))))
