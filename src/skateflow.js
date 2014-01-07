/**
 * jQuery SkateFlow
 *
 * Coverflow-like slide widget based on Skate
 *
 * Copyright (c) 2010-2012 Ronan Dowling
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 *
 * Depends:
 *  skate.js
 */

(function($, undefined) {
  $.widget("ui.skateflow", $.extend({}, $.ui.skate.prototype, {
    version: '0.1',
    options: $.extend({}, $.ui.skate.prototype.options, {
      on_angle: 0,
      off_angle: .3,
      on_scale: 1.0,
      off_scale: .6,
      off_alpha: .8,
      on_alpha: 1.0,
      clearance: .8,
      spacing: .3,
    }),

    _postInit: function() {
      this.items.css('position', 'absolute').bind("click", function() {
        self.activate(this);
        return false;
      });
      this.stageWidth = this.element.parent()[0].offsetWidth;

      // Reset all the filter items so that IE can calculate the center properly.
      this.refresh(1, 1, -1);
    },
    itemActivate: function(item, options) {
      var o = $.extend({}, this.options, options);

      var current = item.index;
      var previous = this.previous.index;

      var self = this;
      var to = Math.abs(previous-current) <=1 ? previous : current+(previous < current ? -1 : 1);
      $.fx.step.flow = function(fx) {
        self.refresh(fx.now, to, current);
      };

      var pos = self._center(this.current.index);
      if (o.animate) {
        this.wrapper.stop().animate({
          flow: 1,
          left: self._center(this.current.index)
        }, {
          duration: o.animate,
          easing: this.options.easing,
          complete: function() {self.refresh(1, to, current);} // Make sure the animation completes entirely.
        });
      }
      else {
        this.wrapper.css('left', pos);
        self.refresh(1, to, current);
      }
    },

    _center: function(item) {
      var pos = -(this.width * this.options.off_scale * this.options.spacing) * item  + (this.stageWidth / 2) - (this.items.eq(item).width() / 2);
      return pos;
    },
    refresh: function(state,from,to) {
      var self = this, offset = null;

      this.items.each(function(i) {
        var side = (i == to && from-to < 0 ) ||  i-to > 0 ? "left" : "right";
        var mod = i == to ? (1-state) : ( i == from ? state : 1 );

        var scale = ((1-mod) * self.options.on_scale) + (mod * self.options.off_scale);
        var angle = ((1-mod) * self.options.on_angle) + (mod * self.options.off_angle);
        var alpha = ((1-mod) * self.options.on_alpha) + (mod * self.options.off_alpha);

        angle = (side == "right" ? -angle : angle);

        // Move all the items in based on how much they've been scaled down
        var offset = i * self.width * self.options.off_scale * self.options.spacing;

        // Add a clearance gap for the larger center item
        var clearance = ((self.width/2) - ((self.width/2) * self.options.off_scale)) * self.options.clearance * mod;
        offset += side == "right" ? -clearance : clearance;

        // Set the z-index based on distance from the current item.
        var z = self.items.length + (side == "left" ? to-i : i-to);
        // Make sure the previous item stays in front until halfway through the transition.
        z += mod < .5 ? 2 : 0;

        if ($.browser.msie) {
          if (this.filters.length) {
            this.filters.item(0).M11 = scale;
            this.filters.item(0).M12 = 0;
            this.filters.item(0).M21 = angle * scale;
            this.filters.item(0).M22 = scale;
            this.filters.item(0).Dx = self.width/2 * (1-scale);
            this.filters.item(0).Dy = self.height/2 * (1-scale) * (1-angle/2);
            this.filters.item(1).opacity = alpha * 100;
          }
          $(this).css({
            left: offset,
            zIndex: z
          });
        }
        else {
          // Only apply the transform if needed.
          var transform = 'none';
          if (angle != 0 || scale != 1) {
            transform = "matrix(1,"+angle+",0,1,0,0) scale("+scale+")";
          }
          $(this).css({
            webkitTransform: transform,
            MozTransform: transform,
            transform: transform,
            left: offset,
            zIndex: z,
            opacity: alpha
          });
        }
      });
    },
   }));
})(jQuery);


