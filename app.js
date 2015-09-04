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

var storage = (function(){
  var storage = navigator.getDeviceStorage("pictures");
  if(storage != null){
    storage.createFileName = function(){
      var now = new Date();
      return "photo-" + (1900 + now.getYear()) + "-" +
        ("00" + (now.getMonth() + 1)).substr(-2) +
        ("00" + now.getDate()).substr(-2) + "-" +
        ("00" + now.getHours()).substr(-2) +
        ("00" + now.getMinutes()).substr(-2) + ".jpg";
    };
    storage.savePhoto = function(blob){
      var self = this;
      return new Promise(function(resolve, reject){
        var req = self.addNamed(blob, self.createFileName());
        req.onsuccess = function(){
          resolve(this.result);
        }
        req.onerror = function(){
          reject(this.error);
        }
      });
    };
  }
  return storage;;
})();

var Effecter = function(){
  this.initialize.apply(this, arguments);
}

Effecter.prototype = {
  initialize: function(canvas, width, height){
    this.el = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = width;
    this.height =  height;
    this.reset();
  },
  get width(){
    return this.el.width;
  },
  set width(value){
    this.el.width = value;
  },
  get height(){
    return this.el.height;
  },
  set height(value){
    this.el.height = value;
  },
  get photo(){
    return this._photo;
  },
  set photo(value){
    this._photo = value;
    this.updatePreview();
  },
  get scale(){
    return this._scale;
  },
  get sourceWidth(){
    var w = this.width * this.scale;
    if(this.photo != null && this.offsetX + w > this.photo.width){
      w = this.photo.width - this.offsetX;
    }
    return w;
  },
  get sourceHeight(){
    var h = this.height * this.scale;
    if(this.photo != null && this.offsetY + h > this.photo.height){
      h = this.photo.height - this.offsetY;
    }
    return h;
  },
  get sourceArea(){
    return {
      x: this.offsetX,
      y: this.offsetY,
      width: this.sourceWidth,
      height: this.sourceHeight
    }
  },
  set scale(value){
    this._scale = value;
    this.updatePreview();
  },
  toBlob: function(){
    var self = this;
    return new Promise(function(resolve, reject){
      if(self.photo != null){
        self.el.toBlob(resolve, "image/jpeg");
      }else{
        reject("No photo is given");
      }
    });
  },
  updatePreview: function(){
    if(this.photo != null){
      var source = this.sourceArea;
      this.ctx.fillStyle = "white";
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.drawImage(this.photo,
                         source.x, source.y,
                         source.width, source.height,
                         0, 0,
                         this.width, this.height);
    }
  },
  reset: function(){
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }
};

window.addEventListener("load", function(){
  var app = new StateMachine();
  app.route = function(hash){
    if(hash.charAt(0) == "#"){
      hash = hash.substr(1, hash.length - 1);
    }
    this.state = hash;
  };
  var effecter = new Effecter(document.querySelector("canvas"),
                              1024, 1024);

  app.addEventListener("pick-photo", function(){
    pickPhoto().then(function(photo){
      effecter.photo = photo;
    });
  });

  app.addEventListener("save-photo", function(){
    if(storage){
      effecter.toBlob().then(function(blob){
        return storage.savePhoto(blob);
      }).then(function(filename){
        new Notification("Photo Effecter Mini", {
                          body: filename + " に保存しました。",
                          icon: "/icons/icon16x16.png"
                        });
      }, function(error){
        console.log(error);
      });
    }
  });

  document.querySelector("[data-role=pick-photo]").addEventListener("click", function(event){
    event.preventDefault();
    app.state = "pick-photo";
  });
  document.querySelector("[data-role=save-photo]").addEventListener("click", function(event){
    event.preventDefault();
    app.state = "save-photo";
  });

  window.location.watch("hash", function(prop, oldValue, newValue){
    app.route(newValue);
  });
  app.route(window.location.hash || "start");
});
