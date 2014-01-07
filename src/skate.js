/**
 * jQuery Skate
 *
 * A versitile, adaptive slideshow widget.
 *
 * Copyright (c) 2010-2012 Ronan Dowling
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 */

(function( $, undefined ) {
  $.widget("ui.skate", {
    version: "0.1",
    widgetEventPrefix: 'skate',
    options: {
      items: '>*',                                            // A selector to specify the slides.
      animate: 500,                                           // Animate between the items. Specify a time in ms or false for no animation.
      width: '',                                              // The width of the slider. Automatically detected if not set.
      height: '',                                             // The width of the slider. Automatically detected if not set.
      auto: false,                                            // The delay (in ms) between automatic rotation. False or 0 for no auto rotation.
      pause: true,                                            // Automatically pause on hover. Only useful when 'auto' is on.
      resize: true,                                           // Automatically resize when the window is resized.
      start: 0,                                               // The index of the item to start on.
      loop: false,                                            // When we get to the end, go back to the start.
      continuous: false,                                      // Keep going infinitely when next or prev is called.
      updateURL: true,

      rowWidth: 1000,                                         // Number of items per row. Set high so that it dosn't wrap by default.

      swipe: true,                                            // Add swipe support for touch devices.

      controls: [],                                           // An array of contols

      // Some control shortcuts
      prev: '«',                                              // The contents of the prev. button. Set to false for none.
      next: '»',                                              // The contents of the next button. Set to false for none.
      tabs: false,                                            // A selector to specify the tabs or false for none.
      pager: 'numbers',                                       // A selector to specify the pager or 'numbers' to generate a numeric pager.


      // callbacks
      activate: null,
      beforeActivate: null,
      beforeLoad: null,
      load: null,
      hash: null,                                             // An optional callback to generate the url hash for a given item.
      itemActivate: null
    },

    _create: function() {
      this._initAll();
    },
    _init: function() {
      this._resize();
    },
    destroy: function () {
      this.element
        .removeClass(this.widgetBaseClass + " " + this.widgetBaseClass + "-disabled")
        .removeData("skate");
  
      for ( var i = this.items.length - 1; i >= 0; i-- )
        this.items[i].item.removeClass(this.widgetBaseClass + "-item");
    },
    _initAll: function() {
      this.element.addClass(this.widgetBaseClass);
      this.element.data('skate', this);
      this.items_index = {};
      this.hash_index = {};
      this.current  = {item: null, index: -1},
      this.previous = {item: null, index: -1},

      this._initItems();
      this._initIndices();
      this._initWrappers();
      this._initControls();
      this._initHash();
      //this._initAutoRotate();
      this._postInit();

      this._start();
    },

    _preInit: function() {},
    _postInit: function() {},
    _initControls: function() {
      var o = this.options;
      var self = this;
      var defaults = {
        position: 'after',
        class: 'skate-control',
        parent: null // This choses the widget element itself.
      };

      this.controls = [];

      // Add some controls for the shorcuts
      if (o.pager == 'numbers') {
        o.controls.push({type: 'pager'});
      }
      if (o.tabs) {
        o.controls.push({type: 'tabs', options: {selector: o.tabs}});
      }
      if (o.prev) {
        o.controls.push({type: 'prev', options: {text: o.prev}});
      }
      if (o.next) {
        o.controls.push({type: 'next', options: {text: o.next}});
      }
      if (o.auto) {
        o.controls.push({type: 'autorotate', options: {timeout: o.auto, pause: o.pause}});
      }

      // Create new widgets for all the controls.
      for (var i in o.controls) {
        var opt = $.extend({}, defaults, o.controls[i]);

        var control = $('<div></div>').addClass(opt.class).addClass(opt.class + '-' + opt.type);
        var widget = 'skatecontrol_' + opt.type;
        if ($.ui[widget]) {
          // Look at this line! Holy syntax, Batman!
          $(control)[widget]($.extend({}, opt.options, {skate: this}));

          // Place this control at the top or bottom of the specified parent element.
          var parent = (opt.parent == null ? $(this.element) : $(this.element).find(opt.parent));
          if (opt.position == 'after') {
            parent.append(control);
          }
          if (opt.position == 'before') {
            parent.prepend(control);
          }
        }
      }
    },
    _offset: function() {
      this.element.offset()
    },
    _initHash: function() {
      var self = this;
      // Set up the hash change event to react to the back/forward button.
      if (this.options.updateURL) {
        $(window).bind('hashchange', function() {
          self._start();
        });
      }
    },
    _initItems: function() {
      this.items = $(this.options.items, this.element).data('skate', this).addClass(this.widgetBaseClass + '-item');
    },
    _initIndices: function() {
      var self = this;
      self.items_index = {};
      self.hash_index = {};
      this.items.each(function(index, item) {
        var hash = self.generateHash(item, index);
        self.items_index[hash] = $(item);
        self.hash_index[index] = hash;
      });
    },
    _initWrappers: function() {
      var o = this.options;

      this.mask        = $('<div class="' + this.widgetBaseClass + '-mask">').css({position: 'relative', overflow: 'hidden'})
      this.wrapper     = $('<div class="' + this.widgetBaseClass + '-wrapper">').append(this.items);

      this.mask.append(this.wrapper);
      this.element.append(this.mask);

      if (o.resize) {
        var self = this;
        $(window).resize(function() {self._resize()});
      }

      this._resize();
    },
    _initAutoRotate: function() {
      var self = this;
      this.options.paused = false;
      if (this.options.auto) {
        setInterval(function() {
          if (!self.options.paused) {
            self.next();
          }
        }, this.options.auto);
        if (this.options.pause) {
          this.element.hover(
            function() {self.options.paused = true},
            function() {self.options.paused = false}
          );
        }
      }
    },
    _height: function() {
      var h = 0;
      var items = this._visibleItems();

      items.each(function(i, item) {
        h = Math.max(h, $(item).height());
      });
      return h;
    },
    _width: function() {
      return this.element.width();
    },
    _visibleItems: function() {
      var current = this.currentIndex();
      if (current > -1) {
        current = this.options.start;
      }
      return this.items.slice(current, this.itemsVisible);
    },
    _setHeight: function() {
      var o = this.options;
      this.height = o.height ? o.height : this._height();
      this.wrapper.css('height', this.height);
      this.mask.css('height', this.height);
    },
    _setWidth: function() {
      var o = this.options;

      this.width = o.width  ? o.width : this._width();
      if (o.maskWidth) {
        this.mask.css('width', o.maskWidth);
      }

      this.maskWidth = this.mask.width();
      this.itemWidth = this.items.eq(0).width();
      this.itemsVisible = Math.max(1, Math.floor(this.maskWidth/this.itemWidth));

      this.items.css('float', 'left');//.css('width', this.width);

      this.wrapper.css({position: 'absolute', 'height': this.height, 'width': this.width * Math.min(o.rowWidth, this.items.length)});
      this.mask.css({position: 'relative', overflow: 'hidden'});

      // Add srolling to the mask for touch devices. 
      // @TODO Fix the speed of this.
      if (o.swipe && 'ontouchstart' in document.documentElement) {
        //this.mask.css({overflow: 'scroll'});
      }
    },
    _resize: function() {
      this.wrapper.css({'height': '', 'width': '', 'position': ''});
      this.mask.css({'height': '', 'width': '', 'position': ''});
      this.items.css({'float': '', 'width': ''});

      this._setWidth();
      this._setHeight();

      this.activate(this.current.items_index, $.extend({}, this.options, {animate: false, bubbleUp: false}));
    },
    _start: function(options) {
      var o = $.extend({}, this.options, options);

      var self = this;
      // If there's a hash sent by the browser activate that tab.
      var index = self.getHashIndex();
      // Otherwise get the specified start index or 0.
      if (index == -1) {
        index = o.start || 0;
      }
      console.log(index);
      if (index != this.current.index) {
        this.activate(index, {animate: false, bubbleUp: true});
      }

      // Resize when the current image loads in case there is no height/width set in html.
      var that = this;
      this._visibleItems().find('img').bind('load', function() {that._resize()});
    },

    activate: function(item, options) {
      var item, index; 
      var o = $.extend({}, this.options, options);

      // We can activate with a jQuery element, a DOM item or an index.
      if (typeof item === 'number' ) {
        index = item;
        item = this.items.eq(index); 
      }
      else {
        item = $(item);
        index = item.index(); 
      }

      if (item.hasClass('' + this.widgetBaseClass + '-item')) {
        if (!item.hasClass('' + this.widgetBaseClass + '-active')) {
          // Set the active class on the current tab and panel.
          item.siblings().removeClass('' + this.widgetBaseClass + '-active').addClass('' + this.widgetBaseClass + '-inactive');
          item.addClass('' + this.widgetBaseClass + '-active').removeClass('' + this.widgetBaseClass + '-inactive');
        }

        // Mark the current item.
        this.previous = this.current;
        this.current = {
          item: item,
          index: index
        }

        // Activate all ancestor slides/tab.
        if (o.bubbleUp) {
          this.bubbleUp();
        }
        // Do the actual activation.
        this.itemActivate(this.current, o);

        // Do the itemActivate callback.
        if (o.itemActivate) {
          o.itemActivate(this.current, o);
        }

        // Update the browser hash.
        hash = this.hash_index[index];
        if (o.updateURL) {
          var pos = $(window).scrollTop();
          this.setHash(hash);
          $(window).scrollTop(pos);
        }

        this._trigger('activate', null, this.current);

        // Do the slide callback.
        if (o.complete) {
          o.complete(item);
        }
      }
    },
    next: function() {
      var next = this.getNextItem();
      this.activate(next);
    },
    prev: function() {
      var prev = this.getPrevItem();
      this.activate(prev);
    },
    go: function(i) {
      this.activate(i);
    },
    currentIndex: function() {
      return this.current && this.current.index != undefined ? this.current.index : -1;
    },
    getItems: function() {
      return this.items; 
    },
    getNextItem: function() {
      var next = this.items.filter('.' + this.widgetBaseClass + '-active').next();

      // Make sure we're not scrolling past the last visible item.
      var index = next.index();

      if (index > this.items.length - this.itemsVisible) {
        next = [];
      }
      // Loop if needed.
      if (next.length == 0 && this.options && this.options.loop) {
        next = this.items.eq(0);
      }
      return next;
    },
    getPrevItem: function() {
      var prev = this.items.filter('.' + this.widgetBaseClass + '-active').prev();
      if (prev.length == 0 && this.options && this.options.loop) {
        prev = this.items.eq(this.items.length - 1);
      }
      return prev;
    },
    bubbleUp: function() {
      this.element.parents('.' + this.widgetBaseClass + '-item').each(function() {
        if (slides = $(this).data('skate')) {
          slides.activate(this, {animate: false});
        }
      });
    },
    setHash: function(hash) {
      hash = hash.replace('#', '');
      var hashes = window.location.hash ? window.location.hash.replace('#', '').split('&') : [];
      for (i in hashes) {
        if (this.items_index['#' + hashes[i]]) {
          hashes[i] = hash;
          window.location.hash = hashes.join('&');
          return;
        }
      }
      // If no matching hash was found to replace.
      hashes.push(hash);
      window.location.hash = hashes.join('&');
    },
    getHash: function() {
      var hashes = window.location.hash.replace('#', '').split('&');
      for (i in hashes) {
        if (this.items_index['#' + hashes[i]]) {
          return '#' + hashes[i];
        }
      }
      return null;
    },
    getHashItem: function() {
      return $(this.items_index[this.getHash()]);
    },
    getHashIndex: function() {
      return this.getHashItem().index();
    },
    itemActivate: function(item, options) {
      var o = $.extend({}, this.options, options);
      var func = o.animate ? 'animate' : 'css';

      // Resize the height and left pos
      var position = item.item.position();
      this.wrapper.stop()[func](
        {
          left: -position.left, 
          top: -position.top
        }, 
        {
          duration: o.duration,
          easing: o.easing,
        });
      this.mask.stop()[func](
        {
          height: item.item.height()
        },
        {
          duration: o.duration,
          easing: o.easing,
        });
    },
    anim: function(t, fx) {
    },
    generateHash: function(item, index) {
      if (this.options.hash) {
        return this.options.hash(item, index);
      }
      return '#' + (index + 1);
    }
  });

  // Add the controler widgets types. These widgets are not indteded to be created except in conjunction with a skate object.
  $.widget("ui.skatecontrol", {
    version: "0.1",
    widgetEventPrefix: 'skatecontrol',
    options: {
      skate: null,                      // The skate object that this controls.
    },
    _create: function() {
      $(this.element).addClass('skatecontrol').addClass(this.widgetBaseClass);

      // Trigger the various setoption logic.
      this._setOptions(this.options);
    },
    _initialize: function() {

    },
    destroy: function() {
      $(this.element).removeClass('skatecontrol');
    },
    _setOption: function(key, value) {
      var fn = '_setOption_' + key;
      if ($.isFunction(this[fn])) {
        this[fn](value);
      }
    },
    _setOption_skate: function(skate) {
      // If a new skate object is passed in we must rebuild.
      this.skate = skate;
      this.destroy();
      this._initialize();

      var self = this;
      $(skate.element).bind('skateactivate', function(e) {self.refresh()});
      this.refresh();
    },
    refresh: function() {
      // To be overriden. Update the controls to reflect the state of the Skate slideshow.
    }
  });

  $.widget("ui.skatecontrol_pager", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {

    }),
    pagerlinks: null,

    refresh: function() {
      if (this.options && this.options.skate && this.pagerlinks) {
        this.pagerlinks.removeClass('active');
        this.pagerlinks.eq(this.options.skate.currentIndex()).addClass('active');        
      }
    },
    _setOption_skate: function(skate) {
      $.ui.skatecontrol.prototype._setOption_skate.apply(this, arguments);
      var items = skate.getItems();
      this.pagerlinks = $();

      var self = this;
      for (var i = 1; i <= items.length; i++) {
        (function (index, pager) {
          var link = $('<a href="#' + index + '" class="' + self.widgetBaseClass + '-pager-link ' + self.widgetBaseClass + '-pager-link-' + index + '">' + index + '</a>')
            .click(function() {skate.go(index - 1); return false;});
          $(pager).append(link);
          self.pagerlinks = self.pagerlinks.add(link);
        })(i, this.element);
      }
      this.refresh();
    }
  });

  $.widget("ui.skatecontrol_tabs", $.ui.skatecontrol_pager, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {
      selector: '.tab',
      clone: false
    }),
    pagerlinks: null,

    refresh: function() {
      if (this.options && this.options.skate && this.pagerlinks) {
        this.pagerlinks.removeClass('active');
        this.pagerlinks.eq(this.options.skate.currentIndex()).addClass('active');        
      }
    },
    _setOption_skate: function(skate) {
      $.ui.skatecontrol.prototype._setOption_skate.apply(this, arguments);
      var items = skate.getItems();
     
      var self = this;
      this.pagerlinks = $(this.options.selector, skate.element).each(function(i, item) {
        var item = self.options.clone ? $(item).clone() : $(item);
        item
           .addClass(self.widgetBaseClass + '-tab')
           .addClass(self.widgetBaseClass + '-pager-link-' + i)
           .click(function() {skate.go(i); return false;});

        if (self.options.clone) {
          $(self.element).append(item);
        }
      });

      this.refresh();
    }
  });

  $.widget("ui.skatecontrol_prevnext", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {}),
    link: null,

    refresh: function() {
      if (this.options && this.options.skate && this.link) {
        var fn = this.options.dir == 'prev' ? 'getPrevItem' : 'getNextItem';
        if (this.options.skate[fn]().length) {
          this.link.removeClass('disabled');
        } else {
          this.link.addClass('disabled');
        }
      }
    },
    _setOption_skate: function(skate) {
      $.ui.skatecontrol.prototype._setOption_skate.apply(this, arguments);
      var fn = this.options.dir, skate = this.options.skate;

      this.link = $('<a class="' + this.widgetBaseClass + '-pager-' + this.options.dir + '" href="#">' + this.options.text + '</a>').click(function(){skate[fn](); return false;});
      $(this.element).append(this.link);
      this.refresh();
    }
  });
  $.widget("ui.skatecontrol_prev", $.ui.skatecontrol_prevnext, {
    options: $.extend({}, $.ui.skatecontrol_prevnext.prototype.options, {
      dir: 'prev',
      text: '«'
    })
  });
  $.widget("ui.skatecontrol_next", $.ui.skatecontrol_prevnext, {
    options: $.extend({}, $.ui.skatecontrol_prevnext.prototype.options, {
      dir: 'next',
      text: '»'
    })
  });
  $.widget("ui.skatecontrol_swipe", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {}),
    link: null,

    _setOption_skate: function(skate) {
      $.ui.skatecontrol.prototype._setOption_skate.apply(this, arguments);
      
      skate.getItems().swipe({
         swipeLeft: function(){skate.next(); return false;},
         swipeRight: function(){skate.prev(); return false;}
      });
    }
  });
  $.widget("ui.skatecontrol_autorotate", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {
      timeout: 5000,
      pause: true
    }),
    link: null,
    interval: null,
    paused: false,

    _setOption_skate: function(skate) {
      $.ui.skatecontrol.prototype._setOption_skate.apply(this, arguments);

      // Clear the old interval if there is one.
      if (this.interval) {
        clearInterval(this.interval);
      }

      var self = this;
      this.paused = false;
      this.interval = setInterval(function() {
        if (!self.paused) {
          skate.next();
        }
      }, this.options.timeout);

      if (this.options.pause) {
        this.element.hover(
          function() {self.paused = true},
          function() {self.paused = false}
        );
      }
    }
  });

})( jQuery );
