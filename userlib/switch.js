/**********************************
 * (c) 20123 by Daniel Schwen
 *
 * Define a Ball object
 * and provide a function 
 * for too Balls to swap position
 * while avoinding a collision.
 * Used to animate visualizations
 * of particle exchange prcesses.
 **********************************/

function Ball(container, x,y, r,css) {
  r = r || 20;
  css = css || {};
  this.div = $('<div class="Ball"></div>')
    .css({
      width: (r*2)+'px',
      height: (r*2)+'px',
    })
    .css(css)
    .appendTo($(container));
  this.r = r;
  this.move(x,y);
}
Ball.prototype.move = function(x,y) {
  this.x = x;
  this.y = y;
  this.div.css({
    left: (x-this.r)+'px', top: (y-this.r)+'px'
  });
}

Ball.exchange = function(b1,b2, callback) {
  var dx = b2.x - b1.x
    , dy = b2.y - b1.y
    , l = Math.sqrt(dx*dx+dy*dy);

  // radii for particle trajectories
  var r1 = b1.r/2 + l*l/(8*b1.r)
    , r2 = b2.r/2 + l*l/(8*b2.r);

  // rotate circles get start end angles
  var phi1 = Math.atan2(l/2,r1-b1.r)
    , phi2 = Math.atan2(l/2,r2-b2.r)
    , theta = Math.atan2(-dy,dx);

  // centers between particles
  var cx = dx/2 + b1.x, cy = dy/2 + b1.y;

  // normalize distance vector
  dx /= l; dy /= l;

  // pivots
  var cx1 = cx + dy*(r1-b1.r)
    , cy1 = cy - dx*(r1-b1.r)
    , cx2 = cx - dy*(r2-b2.r)
    , cy2 = cy + dx*(r2-b2.r);

  // exact final positions
  var fx1 = b2.x, fy1 = b2.y
    , fx2 = b1.x, fy2 = b1.y;

  // animate
  var c = -1.0;
  function animate() {
    if( c<1 ) {
      var d = Math.atan(c*1.5574077246549);
      b1.move( cx1+Math.sin(phi1*d+theta)*r1, cy1+Math.cos(phi1*d+theta)*r1 );
      b2.move( cx2+Math.sin(phi2*d+Math.PI+theta)*r2, cy2+Math.cos(phi2*d+Math.PI+theta)*r2 );
      c += 0.1;
      requestAnimFrame(animate); 
    } else {
      b1.move( fx1, fy1 );
      b2.move( fx2, fy2 );
      (b1.div.add(b2.div)).css('z-index','');
      if( callback ) callback();
    }
  }
  (b1.div.add(b2.div)).css('z-index','10');
  animate();
}

Ball.shakePair = function(b1,b2, callback) {
  var dx = b2.x - b1.x
    , dy = b2.y - b1.y
    , l = Math.sqrt(dx*dx+dy*dy);
  dx /= l; dy /= l;

  // exact final positions
  var fx1 = b1.x, fy1 = b1.y
    , fx2 = b2.x, fy2 = b2.y
    , c = 6*Math.PI;
  function animate() {
    if( c>0 ) {
      b1.move( fx1 + dy*Math.sin(c)*b1.r/2, fy1 - dx*Math.sin(c)*b1.r/2 );
      b2.move( fx2 - dy*Math.sin(c)*b2.r/2, fy2 + dx*Math.sin(c)*b2.r/2 );
      c -= 0.8;
      requestAnimFrame(animate);
    } else {
      b1.move( fx1, fy1 );
      b2.move( fx2, fy2 );
      if( callback ) callback();
    }
  }
  animate();
}

