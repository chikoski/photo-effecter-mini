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

var History = function(){
  this.initialize.apply(this, arguments);
}
History.prototype = {
  initialize: function(){
    this._list = [];
  },
  empty: function(){
    this._list = [];
  },
  add: function(func){
    if(typeof func == "function"){
      this._list.push(func);
    }
  },
  contains: function(func){
    return this._list.indexOf(func) > -1;
  },
  remove: function(func){
    var index = this._list.indexOf(func);
    if(index > -1){
      this._list.splice(index, 1);
    }
  },
  apply: function(src){
    this._list.forEach(function(func){
      func.call(src);
    });
  }
};

var GraphicBuffer = function(){
  this.initialize.apply(this, arguments);
}
GraphicBuffer.prototype = {
  initialize: function(){
    if(arguments.length == 2){
      this._canvas = document.createElement("canvas");
      this._canvas.width = arguments[0];
      this._canvas.height = arguments[1];
    }else{
      this._canvas = arguments[0];
    }
    this._ctx = this._canvas.getContext("2d");
  },
  get ctx(){
    return this._ctx;
  },
  get width(){
    return this._canvas.width;
  },
  get height(){
    return this._canvas.height;
  },
  apply: function(filter){
    if(typeof filter == "function"){
      return filter.call(null, this);
    }
    return null;
  },
  clear: function(color){
    this.ctx.fillStyle = color || "white";
    this.ctx.fillRect(0, 0, this.width, this.height);
  },
  getImageData: function(x, y, width, height){
    return this.ctx.getImageData(x, y, width, height);
  },
  putImageData: function(imageData, x, y){
    this.ctx.putImageData(imageData, x, y);
  }
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
    this._foreground = new GraphicBuffer(this.el);
    this._background = null;
    this._history = new History();

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
  get history(){
    return this._history;
  },
  get offsetX(){
    return this._offsetX;
  },
  set offsetX(value){
    var area =this.sourceArea;
    if(this.photo == null){
      this._offsetX = value;
    }else{
      value = Math.max(0, Math.min(this._background.width - this.width, value));
      console.log(value);
      this._offsetX = value;
      this.updatePreview();
    }
  },
  get offsetY(){
    return this._offsetY;
  },
  set offsetY(value){
    if(this.photo == null){
      this._offsetY = value;
    }else{
      this._offsetY = Math.max(0, Math.min(this._background.height - this.height, value));
      this.updatePreview();
    }
  },
  get photo(){
    return this._photo;
  },
  set photo(value){
    this.reset();
    this._photo = value;
    this.updateScaleByPhotoSize();
    this.createBuffer();
    this.updatePreview();
  },
  get scale(){
    return this._scale;
  },
  get sourceWidth(){
    var w = Math.floor(this.width * this.scale);
    if(this.photo != null && this.offsetX + w > this.photo.width){
      w = this.photo.width - this.offsetX;
    }
    return w;
  },
  get sourceHeight(){
    var h = Math.floor(this.height * this.scale);
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
  apply: function(filter){
    if(this.photo != null && typeof filter == "function" && !this.history.contains(filter)){
      this._background.apply(filter);
      this.history.add(filter);
      this.updatePreview();
    }
  },
  createBuffer: function(){
    var width = Math.floor(this.photo.width / this.scale);
    var height = Math.floor(this.photo.height / this.scale);
    this._background = new GraphicBuffer(width, height);
    this._background.ctx.drawImage(this.photo,
                                   0, 0,
                                   this._background.width, this._background.height);
  },
  updatePreview: function(){
    if(this._background != null){
      this._foreground.clear();
      var data = this._background.getImageData(this.offsetX, this.offsetY, this.width, this.height);
      this._foreground.putImageData(data, 0, 0);
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
    this._scale = 1;
    this._offsetX = 0;
    this._offsetY = 0;
    this.history.empty();
  }
};

function average(data){
  var sum = 0;
  for(var i = 0; i < data.length; i++){
    sum = sum + data[i];
  }
  return sum / data.length;
}

function grayscale(buffer){
  var src = buffer.getImageData(0, 0, buffer.width, buffer.height);
  for(var i = 0; i < src.data.length; i = i + 4){
    var value = average([src.data[i], src.data[i + 1], src.data[i + 2]]);

    src.data[i] = value;
    src.data[i + 1] = value;
    src.data[i + 2] = value;
    src.data[i + 3] = src.data[i + 3];
  }
  buffer.putImageData(src, 0, 0);
  return buffer;
}

function mosaic(buffer){
  var size = 32;
  for(var x = 0; x < width; x += size){
    for(var y = 0; y < height; y += size){
      var data = ctx.getImageData(x, y, size, size);
    }
  }
};

function sepia(buffer){
  var src = buffer.getImageData(0, 0, buffer.width, buffer.height);
  for(var i = 0; i < src.data.length; i = i + 4){
    src.data[i] = src.data[i] * 240 / 255;
    src.data[i + 1] = src.data[i + 1] * 200 / 255;
    src.data[i + 2] = src.data[i + 2] * 148 / 255;
    src.data[i + 3] = src.data[i + 3];
  }
  buffer.putImageData(src, 0, 0);
  return buffer;
}

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

  app.addEventListener("apply-mosaic", function(){
    effecter.apply(mosaic);
  });

  app.addEventListener("apply-grayscale", function(){
    effecter.apply(grayscale);
  });
  app.addEventListener("apply-sepia", function(){
    effecter.apply(sepia);
  });

  document.querySelector("[data-role=pick-photo]").addEventListener("click", function(event){
    event.preventDefault();
    app.state = "pick-photo";
  });
  document.querySelector("[data-role=save-photo]").addEventListener("click", function(event){
    event.preventDefault();
    app.state = "save-photo";
  });

  document.querySelector("[data-role=apply-mosaic]").addEventListener("click", function(event){
    event.preventDefault();
    app.state = "apply-mosaic";
  });

  document.querySelector("[data-role=apply-grayscale]").addEventListener("click", function(event){
    event.preventDefault();
    app.state = "apply-grayscale";
  });

  document.querySelector("[data-role=apply-sepia]").addEventListener("click", function(event){
    event.preventDefault();
    app.state = "apply-sepia";
  });

  window.location.watch("hash", function(prop, oldValue, newValue){
    app.route(newValue);
  });
  app.route(window.location.hash || "start");
});
