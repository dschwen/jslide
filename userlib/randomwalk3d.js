function randomWalk3D( selector, L, R ) {
  var canvas = $(selector)[0],
      c = canvas.getContext('2d'),
      w = canvas.width,
      h = canvas.height,
      pos = [[0,0,0]],
      lhist = [],
      theta = 0,
      waitcount = 0,
      ihandler;

  L = L || 10.0;
  R = R || 200;


  function renderPath() {
    var i, a, b, x, y, thetanew, l = pos.length;

    // rotate into screen plane
    x = pos[l-1][1]; //3d y
    y = pos[l-1][2]; //3d z
    thetanew = -Math.atan2(x,y);
    theta += (thetanew-theta)*0.01;
    a = Math.sin(theta);  //( a -b )
    b = Math.cos(theta);  //( b  a )

    c.setTransform(1,0,0,1,0,0);
    c.clearRect( 0, 0, w, h );
    c.translate(w/2,h/2);

    // trace
    c.strokeStyle = "rgb(255,0,255)";
    c.lineWidth = 0.75;
    c.beginPath();
    c.moveTo( pos[0][0], a*pos[0][1] - b*pos[0][2] );
    for( i = 1; i < l; ++i ) {
      c.lineTo( pos[i][0], a*pos[i][1] - b*pos[i][2] );
    }
    c.stroke();

    // perimeter
    c.strokeStyle = "rgb(0,0,255)";
    c.lineWidth = 1.25;
    c.beginPath();
    c.arc( 0, 0, R, 0, Math.PI*2.0, true);
    c.closePath();
    c.stroke();

    // particle
    c.beginPath();
    c.arc( pos[l-1][0], a*pos[l-1][1] - b*pos[l-1][2], 2, 0, Math.PI*2.0, true);
    c.closePath();
    c.fill();

    // medians
    c.scale(1,a);
    c.lineWidth = 0.75;
    c.beginPath();
    c.arc( 0, 0, R, 0, Math.PI*2.0, true);
    c.closePath();
    c.stroke();
  }

  function wait() {
    if( waitcount == 0 ) {
      clearInterval(ihandler);
      ihandler = setInterval( walk, 1000/50 );
      pos = [[0,0,0]];
    }
    renderPath();
    waitcount--;
  }

  function walk() {
    var sx = Math.random() - 0.5,
        sy = Math.random() - 0.5,
        sz = Math.random() - 0.5,
        sr = Math.sqrt( sx*sx + sy*sy + sz*sz ),
        l = pos.length-1;

    sx = pos[l][0] + L*sx/sr;
    sy = pos[l][1] + L*sy/sr;
    sz = pos[l][2] + L*sz/sr;

    sr = Math.sqrt( sx*sx + sy*sy + sz*sz );

    pos.push( [ sx, sy, sz ] );
    renderPath();

    // perimeter reached?
    if( sr > R ) {
      lhist.push(l);
      waitcount = 300;
      clearInterval(ihandler);
      ihandler = setInterval( wait, 1000/50 );
    }
  }

  return { start: function() { clearInterval(ihandler); ihandler = setInterval( walk, 1000/50 ); },
            stop : function() { clearInterval(ihandler); } };
}