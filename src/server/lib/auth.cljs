(ns lib.auth)

(defn hash [in]
  in)

(defn get-user [username callback]
  (callback {:name "Peter"}))

(defn is-auth [username password callback]
  (callback (and (= username "Peter")
                 (= password "Griffin"))))

(defn is-req-auth [req callback]
  (if-let [s (.-session req)]
    (is-auth (.-username s) (.-password s) callback)
    (callback nil)))

(defn get-auth-user [req callback]
  (is-req-auth req (fn [auth?]
                     (if auth?
                       (get-user (.-username (.-session req)) callback)
                       (callback nil)))))

(defn auth-user [req]
  (if-let [q (.-query req)]
    (when-let [s (.-session req)]
      (set! (.-username s) (.-username q))
      (set! (.-password s) (hash (.-password q))))))

(defn unauth-user [req]
  (if-let [s (.-session req)]
    (.destroy s)))

(defn auth-get [app path callback]
  (.get app path (fn [req res]
                   (get-auth-user req (fn [user] 
                                        (if user
                                          (callback req res user)
                                          (.send res "need to be logged in to access" 403)))))))

(defn init-routes [app]
  (.get app "/login"
        (fn [req res] 
          (if-let [q (.-query req)]
            (is-auth (.-username q) (.-password q)
                      (fn [auth?]
                        (if auth?
                          (do (auth-user req)
                            (.send res "success"))
                          (.send res "invalid username or password" 406)))))))
  (.get app "/logout" (fn [req res] (unauth-user req)
                        (.send res "successfully logged out")))
  (auth-get app "/test_auth" (fn [req res user]
                               (.send res (str "successfully logged in as " (:name user))))))


