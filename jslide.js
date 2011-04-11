var jslide = (function() {
  var scaleFactor, // scale factor
      current,     // current slide number
      acolor = ['red','green','blue','yellow','magenta','pink','brown','black'],
      astyle = [];      // available arrow colors

  function buildSpotLight(r) {
    var canvas, c, grad, im,
        shown = false,
        x, y;

    // build canvas
    canvas = $('<canvas/>').addClass('jslideSpotlight');
    $('body').append(canvas);

    // initial position
    x = 0;
    y = 0;

    // draw and cache spotlight
    c = canvas[0].getContext('2d');
    recache(r);

    // bind the 'dry' mousemove handler (only update coordinates, no redrawing)
    $(document).bind( 'mousemove', mouseMoveHandlerDry );

    // methods
    function recache(newr) {
      r = newr;
      // resize temporarily
      canvas[0].width = 2*r;
      canvas[0].height = 2*r;
      // radial gradient
      grad = c.createRadialGradient(r,r,r*0.75,r,r,r);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      // draw shapes
      c.fillStyle = grad;
      c.fillRect(0,0,2*r,2*r);
      im = c.getImageData( 0, 0, 2*r, 2*r );

      // scale back and redraw
      scale();
    }
    function scale() {
      var w = $(window).width(),
          h = $(window).height();
      canvas[0].width = w;
      canvas[0].height = h;
      draw();
    }
    function draw() {
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.clearRect(0,0,canvas[0].width,canvas[0].height);
      c.fillRect(0,0,canvas[0].width,canvas[0].height);
      c.putImageData( im, x, y );
    }
    function mouseMoveHandler(e) {
      var coord = e.pageX + ' ' + e.pageY;
      x = e.pageX - r;
      y = e.pageY - r;
      draw();
    }
    function mouseMoveHandlerDry(e) {
      var coord = e.pageX + ' ' + e.pageY;
      x = e.pageX - r;
      y = e.pageY - r;
    }
    function mouseWheelHandler(e, delta) {
      var newr = Math.floor( r + (10+r/10)*delta );
      if( newr < 30 || newr > 1000 ) { return; }
      x = x + r - newr;
      y = y + r - newr;
      recache( newr );
    }
    function show() {
      $(document).unbind( 'mousemove', mouseMoveHandlerDry );
      $(document).bind( 'mousemove', mouseMoveHandler );
      $(document).mousewheel( mouseWheelHandler );
      $(window).bind( 'resize', scale );
      $('body').css('cursor','crosshair');
      scale();
      canvas.fadeIn();
      shown = true;
    }
    function hide() {
      $(document).unbind( 'mousemove', mouseMoveHandler );
      $(document).bind( 'mousemove', mouseMoveHandlerDry );
      $(document).unmousewheel( mouseWheelHandler );
      $(window).unbind( 'resize', scale );
      $('body').css('cursor','');
      canvas.fadeOut();
      shown = false;
    }
    function toggle() {
      if( shown ) {
        hide();
      } else {
        show();
      }
      return shown;
    }

    return {
      toggle : toggle
    };
  };

  // global: scaleFactor
  function scale() {
    var cs = $(slideList[current]),
        sc = $('.slides'),
        ww = $(window).width(),
        wh = $(window).height(),
        ew = cs.outerWidth(),
        eh = cs.outerHeight(),
        r = Math.min(ww/ew,wh/eh),
        sx = Math.round((ww-ew*r)/2),
        sy = Math.round((wh-eh*r)/2);

    // scale
    $.each(['webkit','moz','o'], function(i,p) { sc.css('-'+p+'-transform','scale('+r+', '+r+')'); } );
    scaleFactor = r;

    // center
    sc.css( { left: sx+'px', top: sy+'px' } );
  }

  // go to slide
  // global: current
  function goToSlide(n) {
    var handler;
    // leaving a slide or entering the presentation?
    if( current !== undefined ) {
      // fire onleave handler for current slide (may prevent leaving)
      handler = $(slideList[current]).data('onleave');
      if( handler && handler() === false ) {
        return;
      }
    }
    current = n;

    // fire onenter hander
    handler = $(slideList[current]).data('onenter');
    if( handler ) {
      handler();
    }

    // reset visibility
    slideList.each( function(i,e) { 
      $(e).attr( 'class', slideClass[i] );
      if( i == current ) {
        $(e).addClass('slideCurrent');
      } else if ( i == current-1 ) {
        $(e).addClass('slidePrev');
      } else if ( i == current+1 ) {
        $(e).addClass('slideNext');
      } else if ( i < current-1 ) {
        $(e).addClass('slideFarPrev');
      } else if ( i > current+1 ) {
        $(e).addClass('slideFarNext');
      }
    } );

    // make visible changes
    window.location.hash = slideList[current].id;
    scale();
  }

  // next slide
  function nextSlide() {
    if( current < slideList.length-1 ) {
      goToSlide(current+1);
    }
  }

  // previous slide
  function prevSlide() {
    if( current > 0 ) {
      goToSlide(current-1);
    }
  }

  function parseSteps(s) {
    var passTwo = [], steps = [],
        items = s.split(','), 
        toEnd = /^(\d+)-$/,
        fromBegin = /^-(\d+)$/,
        range = /^(\d+)-(\d+)$/,
        num   = /^(\d+)$/,
        i, j, m;
    for( i = 0; i < items.length; ++i ) {
      // range
      m = range.exec( items[i] );
      if( m ) {
        if( m[1] == 0 ) {
          throw 'Steps start at 1';
        }
        for( j = m[1]; j <= m[2]; j++ ) {
          steps[j-1] = true;
        }
        continue;
      }

      // single step
      m = num.exec( items[i] );
      if( m ) {
        if( m[1] == 0 ) {
          throw 'Steps start at 1';
        }
        steps[m[1]-1] = true;
        continue;
      }

      // invalid
      throw 'Invalid step set:' + s;
    }

    return steps;
  }

  // add svg overlay to current slide
  function addOverlay( slide, callback ) {
    var o = $('<div></div>').addClass('svgOverlay');
    $(slide).append(o);
    function initOverlay(svg) {
      var d,m,i;
      d = svg.defs('myDefs');
      for( var i=0; i<acolor.length; i++ ) {
        m = svg.marker(d,acolor[i]+'Arrow',3,2,4,4,'auto'); 
        svg.polyline(m,[[0,0], [4,2],[0,4],[1,2]], { fill: acolor[i] } );
      }                               
      callback(svg);
    }
    o.svg( { onLoad: initOverlay } );
  }
  // get svg handler for slide
  function getOverlay( slide ) {
    return $(slide).find('.svgOverlay').svg('get');
  }
  // draw an arrow
  function arrow(svg,x1,y1,x2,y2, options) {
    svg.line( x1, y1, x2, y2, $.extend( { strokeWidth: 5, opacity: 0.75 }, options ) );
  }
  // connect two elements on the slide with an arrow
  function arrowFromTo( slide, from, to, options ) {
    var f = $(from).offset(), t = $(to).offset(), s = $(slide).offset(), 
        x1 = ( f.left - s.left )/scaleFactor + $(from).width()/2, 
        x2 = ( t.left - s.left )/scaleFactor + $(to).width()/2,
        y1 = ( f.top - s.top )/scaleFactor + $(from).height()/2,
        y2 = ( t.top - s.top )/scaleFactor + $(to).height()/2;
    arrow(getOverlay(slide),x1,y1,x2,y2,options);
  }
  // draw an ellipse around an element on the slide
  function ellipseAround( slide, to, options ) {
    var t = $(to).offset(), s = $(slide).offset(), 
        rx = $(to).width()/2, 
        x  = ( t.left - s.left )/scaleFactor  + rx,
        ry = $(to).height()/2,
        y  = ( t.top - s.top )/scaleFactor + ry;
    getOverlay(slide).ellipse(x,y,rx*1.4,ry*1.4,$.extend( { strokeWidth: 5, stroke: 'blue', fill: 'none', opacity: 0.75 }, options ) );
  }

  // initialization
  var slideList, slideClass = [], stepTable, spotLight;
  function init() {
    var i, j, h,
        common,
        handlerList = ['onleave', 'onenter'];

    // build list of slides, remember orignal classes
    slideList = $('div.slide');
    slideList.each( function(i,e) { slideClass[i] = $(e).attr('class') });

    // append common content to all slides
    common = $('.slidecommon').detach();
    slideList.append(common);

    // compile slide event handlers
    slideList.each( function(i,e) {
      var handler;
      for( j = 0; j < handlerList.length; ++j ) {
        handler =  $(e).data(handlerList[j]);
        if( handler ) {
          $(e).data(handlerList[j], new Function(handler) );
        }
      }
    });

    // analyse step-by-step reveal information
    slideList.each( function(i,e) {
      var steps = $(e).data('steps');
      if( steps !== undefined ) {
        $(e).find('[step]').each( function(j,e) {
          // hook into list
        });
      }
    });

    // Spotlight
    spotLight = buildSpotLight(100);

    // honor url hash
    h = window.location.hash.substr(1);
    if( h !== '' ) {
      for( i = 0; i < slideList.length; ++i ) {
        if( slideList[i].id === h ) {
          goToSlide(i);
          break;
        }
      }
      if( i == slideList.length ) {
        // not found
        alert( h + " not found" );
        goToSlide(0);
      }
    } else {
      goToSlide(0);
    }
    $(window).resize(scale);
    scale();

    // add event handlers
    var frozen = false;
    $(document).keyup( function(e) {
      if( frozen ) { return; }
      switch(e.which) {
        case 34: // page down 
        case 39: // crsr right 
        case 40: // crsr down
        case 32: // space 
          nextSlide(); break;
        case 8 : // backspace
        case 33: // page up 
        case 37: // crsr left 
        case 38: // crsr up 
          prevSlide(); break;
        case 35: // end
          goToSlide(slideList.length-1); break;
        case 36: // home
          goToSlide(0); break;
        case 83 : // s
          spotLight.toggle(); break;
      }
    } );

    // polulate arrow style list
    for( var i=0; i<acolor.length; i++ ) {
      astyle[acolor[i]] = { markerEnd: 'url(#'+acolor[i]+'Arrow)', strokeWidth: 5, stroke: acolor[i] };
    }
  }

  return {
    init : init,
    nextSlide : nextSlide,
    prevSlide : prevSlide,
    freeze    : function() { frozen = true; },
    unfreeze  : function() { frozen = false; },
    addOverlay   : addOverlay,
    getOverlay   : getOverlay,
    arrow        : arrow,
    arrowFromTo  : arrowFromTo,
    ellipseAround: ellipseAround,
    astyle : astyle,
    getStatus : function() { return [ current, slideList, spotLight ]; }
  };
})();


$(jslide.init);

