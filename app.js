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

var Point = function(x, y){
  this.x = x;
  this.y = y;
}
Point.createFromTouch = function(touch){
  return new Point(touch.clientX, touch.clientY);
};

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

    var self = this;
    (function(){
      var previousTouch = null;
      canvas.addEventListener("touchstart", function(event){
        if(event.touches.length == 1){
          previousTouch = Point.createFromTouch(event.touches[0]);
        }
      });
      canvas.addEventListener("touchmove", function(event){
        if(event.touches.length == 1){
          var nextTouch = Point.createFromTouch(event.touches[0]);
          self.offsetX += (previousTouch.x - nextTouch.x) * 2;
          self.offsetY += (previousTouch.y - nextTouch.y) * 2;
          previousTouch = nextTouch;
        }
      });
      canvas.addEventListener("touchend", function(event){
        previousTouch = null;
      });
    })();
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
  get offsetX(){
    return this._offsetX;
  },
  set offsetX(value){
    var area =this.sourceArea;
    if(this.photo == null){
      this._offsetX = value;
    }else{
      this._offsetX = Math.min(this.photo.width - area.width, Math.max(0, value));
      this.updatePreview();
    }
  },
  get offsetY(){
    return this._offsetY;
  },
  set offsetY(value){
    var area = this.sourceArea;
    if(this.photo == null){
      this._offsetY = value;
    }else{
      this._offsetY = Math.min(this.photo.height - area.height, Math.max(0, value));
      this.updatePreview();
    }
  },
  get photo(){
    return this._photo;
  },
  set photo(value){
    this._photo = value;
    this.updateScaleByPhotoSize();
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
    var value = Math.min(this.sourceWidth,
                         this.sourceHeight);
    return {
      x: this.offsetX,
      y: this.offsetY,
      width: value,
      height: value,
      scale: this.scale
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
  updateScaleByPhotoSize: function(){
    if(this.photo != null){
      if(this.photo.width > this.photo.height){
        this.scale = this.photo.height / this.height;
      }else{
        this.scale = this.photo.width / this.width;
      }
      this.minimumScale = this.scale;
    }
  },
  reset: function(){
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }
};
var effecter;
window.addEventListener("load", function(){
  var app = new StateMachine();
  app.route = function(hash){
    if(hash.charAt(0) == "#"){
      hash = hash.substr(1, hash.length - 1);
    }
    this.state = hash;
  };
  var canvas = document.querySelector("canvas");
  effecter = new Effecter(canvas,
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
