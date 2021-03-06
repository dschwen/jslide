/***************************************************
 * jSlide - JavaScript slide presentation framework
 * (c) 2011 by Daniel Schwen
 ***************************************************/

var jslide = (function() {
  var scaleFactor, // scale factor
      current = null,     // current slide number
      currentstep = 0,    // current reveal step
      //acolor = ['red','green','blue','yellow','magenta','pink','brown','black'],
      //astyle = [],      // available arrow colors
      slides, spotLight, maxSize = { w:0, h:0 },
      overview = false,
      useGPU = false,
      clockHandler = null, clockDiv = null,
      lastTime = null;

  // shim layer with setTimeout fallback
  window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame    || 
            window.oRequestAnimationFrame      || 
            window.msRequestAnimationFrame     || 
            function( callback ){
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  function buildSpotLight(r) {
    var canvas, c, grad, im
      , shown = false
      , x, y, tx, ty
      , dirty = null
      , easing = false
      , locked = false
      , ticksSinceMove = 0
      , mouseShown = true
      ;

    // build canvas
    canvas = $('<canvas/>').addClass('jslideSpotlight');
    $(window).resize( function() { dirty = null } );
    $('body').append(canvas);

    // initial position
    x = 0;
    y = 0;

    // draw and cache spotlight
    c = canvas[0].getContext('2d');
    recache(r);

    // mouse cursor auto hide
    setInterval( function() {
      ticksSinceMove++;
      if( shown ) return; // do nothing when spotlight is active

      if( mouseShown ) {
        if( ticksSinceMove > 5 ) {
          $('body').css('cursor','none');
          mouseShown = false;
        }
      } else {
        if( ticksSinceMove <= 5 ) {
          $('body').css('cursor','');
          mouseShown = true;
        }
      }
    }, 500 ); 

    // bind the 'dry' mousemove handler (only update coordinates, no redrawing)
    $(document).bind( 'mousemove', mouseMoveHandlerDry );

    // methods
    function recache(newr) {
      r = newr;
      // resize temporarily
      var s = Math.ceil(2*r);
      canvas[0].width = s;
      canvas[0].height = s;
      // radial gradient
      grad = c.createRadialGradient(r,r,r*0.75,r,r,r);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      // draw shapes
      c.fillStyle = grad;
      c.fillRect(0,0,s,s);
      im = c.getImageData( 0, 0, s, s );

      // scale back and redraw
      dirty = null;
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
      if( dirty === null ) {
        c.clearRect(0,0,canvas[0].width,canvas[0].height);
        c.fillRect(0,0,canvas[0].width,canvas[0].height);
      } else {
        c.clearRect(dirty.x,dirty.y,dirty.w,dirty.h);
        c.fillRect(dirty.x,dirty.y,dirty.w,dirty.h);
      }
      c.putImageData( im, Math.floor(x-r), Math.floor(y-r) );
      dirty = { x: Math.floor(x-r), y: Math.floor(y-r), w: im.width+5, h: im.height+5 };
    }
    function mouseMoveHandler(e) {
      if( !locked && !easing ) {
        x = e.pageX;
        y = e.pageY;
        draw();
      }
    }
    function mouseMoveHandlerDry(e) {
      if( x!=e.pageX || y!=e.pageY ) {
        ticksSinceMove = 0;
      }
      x = e.pageX;
      y = e.pageY;
    }
    function mouseWheelHandler(e, delta) {
      var newr = Math.floor( r + (10+r/10)*delta );
      if( newr < 30 || newr > 1000 ) { return; }
      recache( newr );
    }
    function show() {
      $(document).unbind( 'mousemove', mouseMoveHandlerDry );
      $(document).bind( 'mousemove', mouseMoveHandler );
      $(document).mousewheel( mouseWheelHandler );
      $(window).bind( 'resize', scale );
      //$('body').css('cursor','crosshair');
      $('body').css('cursor','none');
      mouseShown = false;
      dirty = null;
      scale();
      canvas.fadeIn();
      shown = true;
    }
    function hide() {
      $(document).unbind( 'mousemove', mouseMoveHandler );
      $(document).bind( 'mousemove', mouseMoveHandlerDry );
      $(document).unmousewheel( mouseWheelHandler );
      $(window).unbind( 'resize', scale );
      //$('body').css('cursor','');
      canvas.fadeOut();
      shown = false;
      locked = false;
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
      toggle : toggle,
      show: function() {
        if(!shown) show();
        locked = true;
      },
      hide: function() {
        if(shown) hide();
      },
      move: function(nx,ny,nr) { 
        var o = $(slides[current].div).offset();
        x = nx*scaleFactor + o.left;
        y = ny*scaleFactor + o.top;
        if( nr === undefined && shown ) draw();
        if( nr !== undefined ) recache(nr);
      },
      moveTo: function(nx,ny,nr) { 
        var o = $(slides[current].div).offset();
        tx = nx===undefined ? x : Math.floor(nx*scaleFactor+o.left);
        ty = ny===undefined ? y : Math.floor(ny*scaleFactor+o.top);
        tr = nr*scaleFactor || r;
        function ease() {
          function tween(ds) {
            return Math.pow( Math.abs(ds), 0.75 ) * (ds<0?-1:1);
          }
          var dx = tween( (tx-x)/5 )
            , dy = tween( (ty-y)/5 )
            , dr = tween( (tr-r)/10 )
            ;
          if( Math.abs(dx) + Math.abs(dy) > 0.1 || Math.abs(dr) > 0.05 ) {
            x += dx;
            y += dy;
            if( Math.abs(dr) > 0.02 ) {
              r += dr;
              recache(r+dr);
            } else {
              draw();
            }
            requestAnimFrame(ease);
          } else {
            x = tx;
            y = ty;
            r = tr;
            easing = false;
            draw();
          }
        }
        if( !easing ) {
          requestAnimFrame(ease);
          easing = true;
        }
        if( !shown ) {
          show();
          locked = true;
        }
      },
      size: function(newr) {
        x = x + r - newr;
        y = y + r - newr;
        recache( newr );
      }
    };
  };

  // global: scaleFactor
  function scale() {
    var cs = $(slides[current].div),
        sc = $('.slides'),
        ww = $(window).width(),
        wh = $(window).height(),
        ew = cs.outerWidth(),
        eh = cs.outerHeight(),
        ofac=8,
        r = Math.min(ww/ew,wh/eh)/(overview?ofac:1),
        //sx = Math.round( overview ? 0 : (ww-ew*r)/2 ),
        //sy = Math.round( overview ? 0 : (wh-eh*r)/2 );
        sx = Math.round( (ww-ew*r)/(overview?ofac/r:2) ),
        sy = Math.round( (wh-eh*r)/(overview?ofac/r:2) );
    
    // scale
    if( r == 1.0 ) { 
      $.each(['webkit','moz','o','ms'], function(i,p) { sc.css('-'+p+'-transform',''); } );
      console.log('1:1 scale!');
    } else {
      $.each(['webkit','moz','o','ms'], function(i,p) { sc.css('-'+p+'-transform','scale('+r+', '+r+')'); } );
      console.log('r='+r);
    }
    scaleFactor = r;

    // center
    if( overview ) {
      sx = 0;
      sy = 0;
      sc.css( { width: (ww/r)+'px', height: (wh/r)+'px' } );
    }
    sc.css( { left: sx+'px', top: sy+'px' } );
  }

  // go to slide
  // global: current
  function goToSlide(n) {
    var handler, ci, classList = [ 'FarPrev', 'Prev', 'Current', 'Next', 'FarNext' ], now = new Date(), vh;
    // leaving a slide or entering the presentation?
    if( !overview && current !== null ) {
      // fire onleave handler for current slide (may prevent leaving)
      handler = $(slides[current].div).data('onleave');
      if( handler && handler() === false ) {
        return;
      }
      // increment residence time on that slide
      slides[current].time += ( now.getTime() - lastTime );

      // hide videos, show last frame
      vh=$(slides[current].div).find('div.videohelper');
      vh.find('.frameLast').show();
      vh.find('video').hide();

      // hide canvases, show last frame
      $(slides[current].div).find('.canvashelper').each(function(i,e) { e=$(e);
        var c=e.find('canvas').eq(0), i=e.find('.frameFirst').eq(0);
        c.data('running',false).hide();
        i.attr('src',c[0].toDataURL("image/png")).show();
      } );
    }
    lastTime = now.getTime();
    current = n;
    currentstep = 0;

    // hide all elements not visible in step 0 instantly
    $.each( slides[current].hide[0] || [], function(i,e) {
      $(e).fadeTo(0,0);
    });
    // show all elements visible in step 0 instantly
    $.each( slides[current].reveal[0] || [], function(i,e) {
      $(e).fadeTo(0,1);
    });

    // hide videos, show first frame
    vh=$(slides[current].div).find('div.videohelper');
    vh.find('video').each(function(i,e){ try { e.currentTime=0; e.pause(); } catch(e) {} });
    vh.children().hide();
    vh.find('.frameFirst').show();

    // schedule canvas animation
    $(slides[current].div).find('.canvashelper').each(function(i,e) { e=$(e);
      var c=e.find('canvas').eq(0);
      c.hide();
      e.find('.frameFirst').show();
      var draw=c.data('draw');
      
      // check if draw is defined
      if(!draw) return true;

      // schedule start of animation in one second (after transition is finished)
      function anim() {
        draw();
        if( c.data('running') ) requestAnimFrame(anim);
      }
      c.data('running',true);
      setTimeout( function() { 
        if( !c.data('running') ) return;
        anim();
        c.show();
        e.find('.frameFirst').hide();
      },1000);
    } );

    if( !overview ) {
      // fire onenter hander
      handler = $(slides[current].div).data('onenter');
      if( handler ) {
        handler();
      }
      // fire newstep handler
      handler = $(slides[current].div).data('onnewstep');
      if( handler ) {
        handler(1);
      }
    }

    // change visibility
    if( overview ) {
      // move border (opacity?), scroll into view
    } else {
      $.each( slides, function(i,e) { 
        $(e.div).attr( 'class', slides[i].origClass );
        ci = i-current+2;
        $(e.div).addClass( 'slide' + classList[ ci<0 ? 0 : ( ci>4 ? 4 : ci ) ] );
      } );
    }

    // make visible changes
    window.location.hash = slides[current].div.id;
    scale();
  }

  // next slide
  function nextSlide(skip) {
    var handler = $(slides[current].div).data('onnewstep');

    currentstep++;
    // total number of steps is determined by the last step that reveals anything
    // or by explicitly specifying it with data-stems on the slide div
    if( !skip && currentstep < slides[current].reveal.length ) {
      // hide all elements not visible in current step
      $.each( slides[current].hide[currentstep] || [], function(i,e) {
        $(e).fadeTo(500,0);
      });
      // show all elements visible in current step
      $.each( slides[current].reveal[currentstep] || [], function(i,e) {
        $(e).fadeTo(500,1);
      });
      // call newstep event handler
      if( handler ) {
        handler(currentstep+1); // step numbers start at 1
      }
    } else {
      if( current < slides.length-1 ) {
        goToSlide(current+1);
      } else {
        currentstep = 0;
      }
    }
  }

  // previous slide
  function prevSlide(skip) {
    var handler = $(slides[current].div).data('onnewstep');

    currentstep--;
    if( !skip &&  currentstep >= 0 ) {
      // reveal all elements hidden in the next step
      $.each( slides[current].hide[currentstep+1] || [], function(i,e) {
        $(e).fadeTo(500,1);
      });
      // hide all elements revealed in the nest step
      $.each( slides[current].reveal[currentstep+1] || [], function(i,e) {
        $(e).fadeTo(500,0);
      });
      // call newstep event handler
      if( handler ) {
        handler(currentstep+1); // step numbers start at 1
      }
    } else {
      if( current > 0 ) {
        goToSlide(current-1);
      } else {
        currentstep = 0;
      }
    }
  }

  // overview
  function startOverview() {
    $.each( slides, function(i,e) { 
      $(e.div).attr( 'class', slides[i].origClass ).addClass('slideThumb');
      //  .css( { left: (i%4) * 1100, top: Math.floor(i/4) * 800 } );
    } );
    overview = true;
    scale();
  }
  function endOverview() {
    $.each( slides, function(i,e) { 
      $(e.div).removeClass('slideThumb');
      //$(e.div).css( { left: '', top: '' } );
    } );
    overview = false;
    var i = current;
    current = null;
    goToSlide(i);
    scale();
  }
  function toggleOverview() {
    if( overview ) { 
      endOverview();
    } else {
      startOverview();
    }
  }

  function parseSteps(s) {
    var passTwo = [], steps = [],
        items = (s+'').split(','), 
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
        if( !steps[m[2]] ) {
          steps[m[2]] = false;
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
        if( !steps[m[1]] ) {
          steps[m[1]] = false;
        }
        continue;
      }

      // toEnd
      m = toEnd.exec( items[i] );
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
  function addOverlay( slide, x, y, w, h, callback ) {
    var o = $('<div></div>')
      .addClass('svgOverlay')
      .css({
        width: w,
           height: h,
           left: x,
           top: y
      });
    $(slide).append(o);
    function initOverlay(svg) {
      var d,m,i;
      callback(svg);
    }
    o.svg( { onLoad: initOverlay } );
  }
  // draw an arrow
  function arrow( slide, x1,y1,x2,y2, color, options ) {
    var gutter = 10,
        x = Math.min(x1,x2)-gutter, y = Math.min(y1,y2)-gutter,
        w = Math.abs(x1-x2)+2*gutter, h = Math.abs(y1-y2)+2*gutter;
    color = color || 'red';
    function callback(svg) {
      d = svg.defs('myDefs');
      m = svg.marker(d, 'arrow',3,2,4,4,'auto');
      svg.polyline(m, [[0,0], [4,2],[0,4],[1,2]], { fill: color } );
      svg.line( x1-x, y1-y, x2-x, y2-y, $.extend( {
        markerEnd: 'url(#arrow)',
        strokeWidth: 5,
        opacity: 0.75,
        stroke: color
      }, options ) );
    }
    addOverlay( slide, x,y,w,h, callback );
  }
  // connect two elements on the slide with an arrow
  function arrowFromTo( slide, from, to, color, options ) {
    var f = $(from).offset(), t = $(to).offset(), s = $(slide).offset(),
        fw = $(from).width()/2, tw = $(to).width()/2,
        fh = $(from).height()/2, th = $(to).height()/2,
        x1 = ( f.left - s.left )/scaleFactor + fw,
        x2 = ( t.left - s.left )/scaleFactor + tw,
        y1 = ( f.top - s.top )/scaleFactor + fh,
        y2 = ( t.top - s.top )/scaleFactor + th;
    // choose top left bottom right attachment point
    if( Math.abs(x1-x2) > Math.abs(y1-y2) ) {
      // horizontal
      if( x1 > x2 ) {
        x1 -= fw;
        x2 += tw;
      } else {
        x1 += fw;
        x2 -= tw;
      }
    } else {
      // vertical
      if( y1 > y2 ) {
        y1 -= fh;
        y2 += th;
      } else {
        y1 += fh;
        y2 -= th;
      }
    }
    arrow(slide,x1,y1,x2,y2,options);
  }
  // draw an ellipse around an element on the slide
  function ellipseAround( slide, to, options ) {
    var t = $(to).offset(), s = $(slide).offset(), 
        rx = $(to).width()/2, 
        x  = ( t.left - s.left )/scaleFactor  + rx,
        ry = $(to).height()/2,
        y  = ( t.top - s.top )/scaleFactor + ry;
    //getOverlay(slide).ellipse(x,y,rx*1.4,ry*1.4,$.extend( { strokeWidth: 5, stroke: 'blue', fill: 'none', opacity: 0.75 }, options ) );
  }

  // react on hashchange events
  function hashchange() {
    // honor url hash
    h = window.location.hash.substr(1);
    $.each( slides, function(i,e) {
      if( slides[i].div.id === h && i !== current ) {
        goToSlide(i);
        return false;
      }
    } );

    // manually navigated to a non-existing hash
    if( current === null ) {
      goToSlide(0);
    }
  }

  // build al flot plots from data stored in separate files
  function buildPlots() {
    function log10Transform(v) {
      return Math.log(v)/Math.log(10);
    }
    function log10InverseTransform(v) {
      return Math.pow(10,v);
    }
    function log10TickGenerator(axis) {
      if( axis.min <= 0 ) { throw 'Negative range for log scale'; }
      var res = [], c = 1, // prefactor c*10^p
          a, p = Math.floor(Math.log(axis.min)/Math.log(10)); // exponent

      do {
        a = c*Math.pow(10,p);
        if( a >= axis.min && a <= axis.max ) {
          if( c == 1 ) {
            res.push([a,'10<sup>'+p+'</sup>']);
          } else {
            res.push([a,'']);
          }
        }

        c++;
        if( c == 10 ) {
          c = 1;
          p++;
        }
      } while(a < axis.max )

      return res;
    }

    $('div.plot').each( function(i,e) {
      function onDataReceived(file) {
        $.each( ['xaxis','yaxis'], function( i, axis ) { 
          if( file.aux[axis] = 'log' ) {
            file.options[axis].ticks = log10TickGenerator;
            file.options[axis].transform = log10Transform;
            file.options[axis].inverseTransform = log10InverseTransform;
          }
        } );
        $.plot($(e), file.data, file.options);
      }
      var url = $(e).data('file');
      if( url.substr(0,1) == '#' ) {
        onDataReceived( $.parseJSON( $(url).html() ) );
      } else {
        $.ajax({
              url: url,
              method: 'GET',
              dataType: 'json',
              success: onDataReceived,
              error: function(x,t,e) { $(e).html('Error:'+t).css('background-color','red'); }
          });
      }
    });
  }

  // show/hide the time
  function toggleClock() {
    var time, d;

    function updateTime() {
      time += 1000;
      d.setTime(time);
      clockDiv.html( d.toLocaleTimeString() );
    }

    if( clockHandler === null ) {
      if( clockDiv === null ) {
        $('body').append( clockDiv = $('<div></div>').addClass('clock') );
      }
      d = new Date();
      time = d.getTime();
      clockDiv.html( d.toLocaleTimeString() );
      clockDiv.fadeIn();
      clockHandler = setInterval( updateTime, 1000 );
    } else {
      clearInterval(clockHandler);
      clockHandler = null;
      clockDiv.fadeOut();
    }
  }

  // progress spinner
  function progressSpinner( slideSelector, numSteps ) {
    var canvas =  $('<canvas width="160" height="160"></canvas>').addClass('stepprogress').appendTo(slideSelector),
              //.attr( {width: 100, height: 100 } )
        c = canvas[0].getContext('2d'),
        w = canvas[0].width,
        h = canvas[0].height,
        T = 2.0*Math.PI/numSteps, // slice width
        dT = Math.PI/180.0 * 8.0, // spacing
        r = Math.min(w,h)/2;

    c.fillStyle = 'rgba(0,0,0,0.125)';
    c.fillRect(0,0,w,h);
    // newstep event handler
    return function(n) {
      var i;
      c.clearRect(0,0,w,h);
      for( i = n; i < numSteps; ++i ) {
        c.beginPath();
        c.arc( w/2, h/2, r,   i*T + dT/2 - Math.PI/2, (i+1)*T - dT/2 - Math.PI/2, false );
        c.arc( w/2, h/2, r/4, (i+1)*T - dT/2 - Math.PI/2, i*T + dT/2 - Math.PI/2, true );
        c.fill();
      }
    }
  }
  
  // time the talk
  function reportTiming() {
    var total = 0, now = new Date();
    function formatTime(t) {
      var s = '', d;
      t /= 1000.0;
      if( t > 60*60 ) {
        d = Math.floor(t/(60*60));
        s += d + 'h ';
        t -= d*60*60
      }
      if( t > 60 ) {
        d = Math.floor(t/60);
        s += d + 'm ';
        t -= d*60
      }
      if( t > 0 ) {
        s += Math.round(t*100)/100.0 + 's ';
      }
      return s;
    }
    slides[current].time += ( now.getTime() - lastTime );
    lastTime = now.getTime();
    $.each( slides, function(i,e) { 
      if( e.time > 0 ) {
        console.log( e.title + ' ' + formatTime(e.time) );
      }
      total += e.time;
    } );
    console.log( 'Total: ' + formatTime(total) );
  }

  // reset timing data
  function clearTiming() {
    var now = new Date();
    lastTime = now.getTime();
    $.each( slides, function(i,e) { 
      e.time = 0;
    } );
  }
  
  // initialization
  // global: slides, spotLight;
  function init() {
    var i, j, h,
        common = $('.slidecommon').detach(),
        handlerList = ['onleave', 'onenter', 'onnewstep'];

    slides = [];
    $('div.slide').each( function(i,e) {
      var handler, steps = parseInt($(e).data('steps')) || 0;

      // build list of slides, remember orignal classes
      slides[i] = {
        div: e,
        title: $(e).children('h1').eq(0).text() || "untitled",
        time: 0,
        origClass: $(e).attr('class'),
        hide:   new Array(steps),
        reveal: new Array(steps)
      }

      // find largest dimensions (should all be the same actually)
      maxSize.w = Math.max( maxSize.w, $(e).outerWidth() );
      maxSize.h = Math.max( maxSize.h, $(e).outerHeight() );

      // compile slide event handlers
      for( j = 0; j < handlerList.length; ++j ) {
        handler =  $(e).data(handlerList[j]);
        if( handler && typeof handler === 'string' ) {
          $(e).data(handlerList[j], new Function(handler) );
        }
      }
    } )
    // append common content to all slides
    //.not('.title').append(common);
    .not('.title').prepend(common);

    // hook up doubleclick event
    $.each( slides, function(i,e) {
      $(e.div).dblclick( function() { 
        goToSlide(i);
        if( overview ) {
          endOverview();
        }
      } );
    });

    // touch events for mobile devices
    (function(){
      var touches = {};
      $('body')
        .bind('touchstart',function(e){
          var i, c =  e.originalEvent.changedTouches;
          for( i = 0; i < c.length; i++ ) {
            touches[c[i].identifier] = { x: c[i].screenX, y: c[i].screenY };
          }
        })
        .bind('touchmove',function(e){
          e.preventDefault();
        })
        .bind('touchend',function(e){
          var i, dx, dy, c =  e.originalEvent.changedTouches;
          for( i = 0; i < c.length; i++ ) {
            if( c[i].identifier in touches ) {
              dx = c[i].screenX - touches[c[i].identifier].x;
              dy = c[i].screenY - touches[c[i].identifier].y;
              delete touches[c[i].identifier];
              
              // get direction
              if( Math.abs(dy)*2 < Math.abs(dx) ) {
                //horizontal
                if( dx > 0 ) {
                  // back a step
                  prevSlide();
                } else {
                  // forward a step
                  nextSlide();
                }
              } else {
                // vertical
                if( dy<0 ) {
                  // go fullscreen
                  
                }
              }
              console.log(dx+','+dy);
            }
          }
        })
    })();

    // build all plots
    buildPlots();

    // center all elements in class="slide center" slides if not using a webkit browser
    if( !/AppleWebKit/.test(navigator.userAgent) ) { // yes, terrible!!
      $('.slide.center').each(function(i,e){
        // get slide content area
        var sw = $(e).width()
          , sh = $(e).height();
console.log($(e).attr('id'));
        $(e).children().each(function(j,f){
          if( $(f).css('position') === 'static' ) {
            var w = $(f).outerWidth()
              , h = $(f).outerHeight();
console.log(w,h);
            $(f).css( {
              //'border': '3px dotted red',
              'position': 'absolute',
              'top' : ((sh-h)/2+50)+'px',
              'left' : ((sw-w)/2+10)+'px'
            } );
          }
        });
      });
    }

    // analyse step-by-step reveal information
    var print = document.location.hash === "#_print_";
    function stepProcessing() {
      $.each( slides, function(i,e) {
        $(e.div).find('[data-step]').each( function(j,f) {
          // hook into list
          var steps = parseSteps( $(f).data('step') );
          // initial state
          for( var k = 0; k < steps.length; ++k ) {
            if( steps[k] == true && ( k==0 || steps[k-1] != true ) ) {
              if( e.reveal[k] ) {
                e.reveal[k].push(f);
              } else {
                e.reveal[k] = [ f ];
              }
            }
            if( steps[k] != true && ( k==0 || steps[k-1] == true ) ) {
              if( e.hide[k] ) {
                e.hide[k].push(f);
              } else {
                e.hide[k] = [ f ];
              }
            }
          }
          // apply initial visibility
          if( !print && !steps[0] ) { $(f).hide(); }
        });

        // if printing create slide copies now
        if( print ) {
          var handler = $(e.div).data('onnewstep')
            , k, copy;
          
          console.log('cloning slide steps');

          currentstep = 0;
          // total number of steps is determined by the last step that reveals anything
          // or by explicitly specifying it with data-stems on the slide div
          while( currentstep < e.reveal.length ) {
            // hide all elements not visible in current step
            $.each( e.hide[currentstep] || [], function(j,f) {
              $(f).css('visibility','hidden');
            });
            // show all elements visible in current step
            $.each( e.reveal[currentstep] || [], function(j,f) {
              $(f).css('visibility','visible');
              //$(f).fadeIn(0);
            });
            // call newstep event handler
            if( handler ) {
              handler(currentstep+1); // step numbers start at 1
            }
            // clone and insert befor real slide
            copy = $(e.div).clone(false);
            copy.removeAttr("id").find("*").removeAttr("id");
            copy.insertBefore($(e.div));
            // copy canvas contents
            k = $(e.div).find('canvas');
            copy.find('canvas').each(function(j,f) {
              var nc = f.getContext('2d');
              nc.drawImage(k[j],0,0);
            });
            currentstep++;
          } 
          // remove real slide from DOM
          if( e.reveal.length > 0 ) { $(e.div).remove(); }  
        }
      } );
    }

    // printing, quit now
    if( print ) {
      setTimeout( stepProcessing, 10000 );
      return;
    } else {
      stepProcessing();
    }

    // Spotlight
    spotLight = buildSpotLight(100);

    // honor url hash
    hashchange();  
    $(window).bind('hashchange',hashchange);

    // react on window resizes
    $(window).resize(scale);
    scale();
    
    //backjump
    var backjump = 0, goingforward = true;

    // add event handlers
    var frozen = false;
    $(document).keyup( function(e) {
      if( frozen ) { return; }
      switch(e.which) {
        case 34: // page down 
        case 39: // crsr right 
        case 40: // crsr down
        case 32: // space
          goingforward = true;
          nextSlide(e.shiftKey); break;
        case 8 : // backspace
        case 33: // page up 
        case 37: // crsr left 
        case 38: // crsr up 
          if( goingforward ) {
            goingforward = false;
            backjump = current;
          }
          prevSlide(e.shiftKey); break;
        case 35: // end
          goToSlide( slides.length - 1 ); break;
        case 36: // home
          goToSlide(0); break;
        case 83 : // s
          spotLight.toggle(); break;
        case 79 : // o
          toggleOverview();
          break;
        case 80: // p
          buildPlots();
          break;
        case 84: // t
          if( e.shiftKey ) {
            reportTiming();
          }
          break;
        case 90: // z
          if( e.shiftKey ) {
            clearTiming();
          }
          break;
        case 66: // b
          goToSlide(backjump);
          break;
        case 67: // c
          toggleClock();
          break;
        case 71: // G
          if( e.shiftKey ) {
            useGPU = !useGPU;
            $.each(['webkit','moz','o','ms'], function(i,p) { 
              $('div.slide').css('-'+p+'-transform', useGPU ? 'translateZ(0)' : ''); 
            } );
          }
          break;
      }
    } );

    // enhance all video elements
    /*$('video')
      .toggle( function(){ this.play() }, function(){ this.pause() } )
      .mouseenter( function(){ this.setAttribute("controls","controls"); } )
      .mouseleave( function(){ this.removeAttribute("controls"); } );
      .each(function(i,e){
        e=$(e);
        e.hide();
        e.bind('playing',function(){ e.show(); });
      });*/

    // insert video modules
    $('.videohelper').each(function(i,e) { e=$(e);
      var v=e.find('video')
        .bind('play',function() {
          e.children().hide();
          v.show();
        })
        .mouseenter( function(){ this.setAttribute("controls","controls"); } )
        .mouseleave( function(){ this.removeAttribute("controls"); } );
      var w=v.width(), h=v.height();
      v.hide();

      var src=v.attr('src');
      $('<img>').addClass('frameFirst').attr('src',src+'.first.png').appendTo(e);
      $('<img>').addClass('frameLast').attr('src',src+'.last.png').hide().appendTo(e);
      e.children()
        .css({
          width: '100%', height: '100%', position: 'absolute', top: 0, left: 0
        })
        .toggle( function(){ e.children().hide(); v.show(); v[0].play() }, function(){ v.pause() } );
    });

    // prepare canvas animations
    $('.canvashelper').each(function(i,e) { e=$(e);
      var c=e.find('canvas').eq(0);
      var draw=c.data('draw');
      // check if draw is defined
      if(!draw) return true;
      // call draw method to build first frame
      draw();
      // hide original canvas
      c.hide();
      // add first frame placeholder image
      var i=$('<img>').addClass('frameFirst').appendTo(e)
        .css({
          width: '100%', height: '100%', position: 'absolute', top: 0, left: 0
        });
      i.attr('src',c[0].toDataURL("image/png"));
    } );
  }

  return {
    init : init,
    nextSlide : nextSlide,
    prevSlide : prevSlide,
    freeze    : function() { frozen = true; },
    unfreeze  : function() { frozen = false; },
    addOverlay   : addOverlay,
    arrow        : arrow,
    arrowFromTo  : arrowFromTo,
    //ellipseAround: ellipseAround,
    getStatus : function() { return [ current, slides, spotLight ]; },
    progressSpinner : progressSpinner,
    spotLight: function() { return spotLight; }
  };
})();


$(jslide.init);

