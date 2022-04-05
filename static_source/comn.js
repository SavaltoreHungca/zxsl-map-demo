function paramlizeForPost(inputData, files) {
    let requestData = new FormData();
    Object.keys(inputData || {}).map((i) => {
        if (Array.isArray(inputData[i])) {
            for (let j in inputData[i]) {
                requestData.append(i, inputData[i][j]);
            }
        } else {
            requestData.append(i, inputData[i]);
        }
    });
    if (files) {
        for (let name in files) {
            if (Array.isArray(files[name])) {
                for (let f of files[name]) {
                    requestData.append(name, f);
                }
            } else {
                requestData.append(name, files[name]);
            }
        }
    }
    return requestData;
}

function paramlizeForGet(data) {
    let str = '';
    for (const name in data || {}) {
        if (Array.isArray(data[name])) {
            for (let j of data[name]) {
                str += encodeURIComponent(name) + "=" + encodeURIComponent(j) + "&";
            }
        }
        else {
            str += encodeURIComponent(name) + "=" + encodeURIComponent(data[name]) + "&";
        }
    }
    if (str !== '') {
        str = str.substring(0, str.length - 1);
    }
    return str;
}

function uuid() {
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";
 
    var uuid = s.join("");
    return uuid;
}

function verticalLine(b, xValue, tag){
    b.create('functiongraph', [function(x){return (x - xValue)/ 0.00000000000000001}], 
        {strokeColor:'red',strokeWidth:1,dash:2});
    b.create('point', [xValue, 0], {name: tag?tag:`(${xValue}, 0)`});
}

function horizontalLine(b, yValue, tag){
    b.create('functiongraph', [function(x){return yValue}], 
        {strokeColor:'red',strokeWidth:1,dash:2});
    b.create('point', [0, yValue], {name: tag?tag:`(0, ${yValue})`});
}

function getBox(name) {
    const div = document.createElement('div');
    const title = document.createElement('div');
    const container = document.createElement('div');
    title.innerHTML = name;
    title.style.cssText = "text-align: right;";
    container.appendChild(div);
    container.appendChild(title);
    container.style.cssText = "display: inline-block; width: 500px; margin: 10px 50px";
    container.setAttribute("nam", "container");
    div.style.cssText = 'width: 500px; height: 500px; display: inline-box;';
    div.className = "jxgbox";
    document.body.appendChild(container);
    div.id = "_" + uuid();
    return div.id;
}

function drawDigram(func, name) {
    let b = JXG.JSXGraph.initBoard(getBox(name || ""), { boundingbox: [-10, 10, 10, -10], axis: true, grid: true, showCopyright: false });
    if(Array.isArray(func)){
        func.forEach(i=>{
            b.create('functiongraph', [i]);
        })
    }else{
        b.create('functiongraph', [func]);
    }
}