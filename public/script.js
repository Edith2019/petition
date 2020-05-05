(function () {
    // console.log("linked");
    const canvas = document.getElementById('canvas');
    // console.log("canvas", canvas);
    const ctx = canvas.getContext('2d');
    console.log("ctx", ctx);
    const sigArea = canvas.getBoundingClientRect();
    let isDrawing = false;
    let x = 0;
    let y = 0;


    $('canvas').on('mousedown', (e) => {

        x = e.clientX - sigArea.left;
        y = e.clientY - sigArea.top;
        isDrawing = true;

    });

    $('canvas').on('mousemove', (e) => {
        if (isDrawing === true) {
            drawLine(ctx, x, y, e.clientX - sigArea.left, e.clientY - sigArea.top);
            x = e.clientX - sigArea.left;
            y = e.clientY - sigArea.top;
        }
    });

    window.addEventListener('mouseup', e => {
        if (isDrawing === true) {
            drawLine(ctx, x, y, e.clientX - sigArea.left, e.clientY - sigArea.top);
            x = 0;
            y = 0;
            isDrawing = false;
        }
    });

    function drawLine(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.strokeStyle = '#99cc99';
        ctx.lineWidth = 1;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.closePath();
    }

    $('button').on('click', () => {
        var dataURL = document.getElementById('canvas').toDataURL();
        console.log("dataurl", dataURL);
        var imga = document.createElement("img");
        imga.href = dataURL;
        document.body.appendChild(imga);
        $('#sig').val(dataURL);

    });


}());

