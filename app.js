var StateMachine = function(){
  this.initialize.apply(this, arguments);
}
StateMachine.prototype = {
  _state: null,
  _callbacks: {},
  /**
   * オブジェクトの初期化関数
   * @return {null}
   */
  initialize: function(){
    console.log("初期化開始");
  },
  /**
   * state 属性のセッターメソッド
   * @param  {String} newState 遷移する先の状態名
   * @return {null}
   */
  set state(newState){
    console.log(newState + "へ遷移");
    _state = newState;
    var list = this._callbacks[_state];
    if(list != null && list.length > 0){
      for(var i = 0; i < list.length; i++){
        list[i].call();
      }
    }
  },
  get state(){
    return _state;
  },
  addEventListener: function(stateName, callback){
    if(this._callbacks[stateName] == null){
      this._callbacks[stateName] = [];
    }
    this._callbacks[stateName].push(callback);
  },
  removeEventListener: function(stateName, callback){
    var list = this._callbacks[stateName];
    if(list !== null){
      var index = list.indexOf(callback);
      if(index > -1){
        list.splice(index, 1);
      }
    }
  }
};

function pickPhoto(){
  return new Promise(function(resolve, reject){
    var req = new MozActivity({
        name: "pick",
        data: {
          type: "image/jpeg"
        }
    });
    req.onsuccess = function(){
      var image = new Image();
      image.src = window.URL.createObjectURL(this.result.blob);
      image.addEventListener("load", function(){
        console.log("写真のロード完了");
        resolve(image);
      });
    };
    req.onerror = function(){
      reject(this.error);
    };
  });
}

window.addEventListener("load", function(){
  var app = new StateMachine();
  app.route = function(hash){
    if(hash.charAt(0) == "#"){
      hash = hash.substr(1, hash.length - 1);
    }
    this.state = hash;
  };

  app.addEventListener("pick-photo", function(){
    pickPhoto().then(function(photo){
      console.log(photo);
    });
  });

  window.location.watch("hash", function(prop, oldValue, newValue){
    app.route(newValue);
  });
  app.route(window.location.hash || "start");
});
