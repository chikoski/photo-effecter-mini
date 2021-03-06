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
  /**
   * state 属性のゲッターメソッド
   * @return {String} 状態
   */
  get state(){
    return _state;
  },
  /**
   * 状態が変化した際に呼ばれるイベントハンドラの設定メソッド
   * @param  {String}   stateName 状態の名前
   * @param  {Function} callback  イベントハンドラ
   * @return {null}
   */
  addEventListener: function(stateName, callback){
    if(this._callbacks[stateName] == null){
      this._callbacks[stateName] = [];
    }
    this._callbacks[stateName].push(callback);
  },
  /**
   * イベントハンドラの削除用関数
   * @param  {String}   stateName 状態の名前
   * @param  {Function} callback  削除するイベントハンドラ
   * @return {null}
   */
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

/**
 * 画像を選択する関数
 * @return {Promise} 選択を行うPromiseオブジェクト
 */
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

// DeviceStorageオブジェクトに、メソッドを追加する
var storage = (function(){
  var storage = navigator.getDeviceStorage("pictures");
  if(storage != null){
    /**
     * 時間から写真のファイル名を作成する関数
     * @return {String} ファイル名
     */
    storage.createFileName = function(){
      var now = new Date();
      return "photo-" + (1900 + now.getYear()) + "-" +
        ("00" + (now.getMonth() + 1)).substr(-2) +
        ("00" + now.getDate()).substr(-2) + "-" +
        ("00" + now.getHours()).substr(-2) +
        ("00" + now.getMinutes()).substr(-2) + ".jpg";
    };
    /**
     * 写真を保存するメソッド
     * @param  {Blob} blob 写真のBlob
     * @return {Promise}   写真の保存を行うPromiseオブジェクト
     */
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

// 2次元平面上の点を表したオブジェクト
var Point = function(x, y){
  this.x = x;
  this.y = y;
}
/**
 * タッチオブジェクトからPointオブジェクトを作成するファクトリメソッド
 * @param  {Touch} touch タッチされた点
 * @return {Point}       タッチされた点
 */
Point.createFromTouch = function(touch){
  return new Point(touch.clientX, touch.clientY);
};

/**
 * フィルタ処理の対象となるバッファを表したオブジェクト
 */
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

/**
 * フィルタ処理のUIを担当するオブジェクト
 */
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
    if(this.photo != null && typeof filter == "function"){
      this._background.apply(filter);
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
  }
};

/**
 * 平均を求める関数
 * @param  {Array} data データ群
 * @return {Number}     平均値
 */
function average(data){
  var sum = 0;
  for(var i = 0; i < data.length; i++){
    sum = sum + data[i];
  }
  return sum / data.length;
}

/**
 * グレースケールを実現するフィルタ
 * @param  {GraphicBuffer} buffer フィルタを適用するGraphicBuffer
 * @return {GraphicBuffer}        適用後のGraphicBuffer
 */
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

/**
 * モザイク処理を実現するフィルタ
 * @param  {GraphicBuffer} buffer フィルタを適用するGraphicBuffer
 * @return {GraphicBuffer}        適用後のGraphicBuffer
 */
function mosaic(buffer){
  var size = 64;
  var pixels = size * size;
  for(var x = 0; x < buffer.width; x += size){
    for(var y = 0; y < buffer.height; y += size){
      var src = buffer.getImageData(x, y, size, size);
      var r = 0;
      var g = 0;
      var b = 0;
      for(var i = 0; i < src.data.length; i = i + 4){
        r += src.data[i];
        g += src.data[i + 1];
        b += src.data[i + 2];
      }
      var rgb = [Math.floor(r / pixels),
                 Math.floor(g / pixels),
                 Math.floor(b / pixels)];
      buffer.ctx.fillStyle = "rgb(" + rgb.join(",") + ")";
      buffer.ctx.fillRect(x, y, size, size);
    }
  }
};

/**
 * 色調をセピアに変更するフィルタ
 * @param  {GraphicBuffer} buffer フィルタを適用するGraphicBuffer
 * @return {GraphicBuffer}        適用後のGraphicBuffer
 */
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

// アプリの状態変化に対応した処理の設定
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

// UI パーツに対する操作のハンドラ設定。ここではアプリの状態を変化させるにとどまる
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

// Location オブジェクトの変化に合わせて、アプリの状態を変化させる。リンクの処理
  window.location.watch("hash", function(prop, oldValue, newValue){
    app.route(newValue);
  });
  app.route(window.location.hash || "start");
});
