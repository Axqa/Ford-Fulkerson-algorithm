// TODO: ctrl+Z

const circleTolerance = 5;
const lineTolerance = 20;
const magnetPower = 50;

class Vertex {
    static count = 0;
    static countUnsymboled = 0;
    static vertices = [];
    constructor(x, y, symbol = null, radius = 20, borderRadius = 4, color = 'black', label = 1) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.borderRadius = borderRadius;
        this.color = color;
        this.ghost = false;
        this.visible = true;

        if (symbol) {
            this.symboled = true;
            this.symbol = symbol;
        } else {
            Vertex.countUnsymboled++;
            this.symboled = false;
            this.symbol = Vertex.countUnsymboled.toString();
        }

        this.text = this.symbol;
        this.label = label;
        this.labelShow = true;
        this.labelAngle = Math.PI * 3 / 4;

        this.labelFont = "bold 12pt Courier";
        this.labelColor = "green";

        this.drawText = true;
        Vertex.count++;

        this.edges = []; // От этой вершины
        this.edgesTo = []; // К этой вершине

        Vertex.vertices.push(this);
    }
    
    remove() {
        Vertex.vertices = Vertex.vertices.filter(vertex => vertex!== this);
        Vertex.count--;

        if (selectedObject === this) {
            changeSelection(null);
        }

        if (!this.symboled) {
            Vertex.countUnsymboled--;
        }

        Vertex.vertices.forEach(vertex => {
            if (!vertex.symboled && Number(vertex.symbol) > Number(this.symbol)) {
                vertex.symbol = Number(vertex.symbol) - 1;
            }

            
            vertex.edges = vertex.edges.filter(edge => edge.endVertex !== this);
        });

        this.edges.forEach(edge => {
            edge.remove();
        });
        this.edgesTo.forEach(edge => {
            edge.remove();
        });
    }

    draw(ctx, drawAll = false) {
        if (!this.visible) {
            return;
        }

        // clear background
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.arc(this.x, this.y, this.radius - this.borderRadius, 0, Math.PI * 2, true);
        if (selectedObject === this && !drawAll) {
            ctx.fillStyle = 'blue';
        } else {
            ctx.fillStyle = this.color;
        }

        if (this.ghost) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        }

        ctx.fill();

        ctx.font = "bold 18pt Courier";        
        
        if (this.drawText) {
            drawTextCentered(ctx, this.text, this.x, this.y);

        }
        
        if (this.labelShow && !this.ghost) {
            const labelX = this.x - this.radius * Math.cos(this.labelAngle);
            const labelY = this.y - this.radius * Math.sin(this.labelAngle);
            drawTextCentered(ctx, drawAll ? this.label : '*', labelX, labelY, this.labelFont, this.labelColor);
        }
    }

    pointIn(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return (dx * dx + dy * dy) < Math.pow(this.radius + circleTolerance, 2);;
    }

    pointOnBorder(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        const dd = dx * dx + dy * dy;
        return dd > Math.pow(this.radius - this.borderRadius - circleTolerance,2) && dd < Math.pow(this.radius + circleTolerance, 2);;
    }

    pointOnLabel(x, y) {
        if (!this.labelShow) {
            return false;
        }
        
        const labelX = this.x - this.radius * Math.cos(this.labelAngle);
        const labelY = this.y - this.radius * Math.sin(this.labelAngle);
        
        const {width,height} = textSize('*', this.labelFont);
        const w = width;
        const h = height;

        return (x > labelX - w / 2 && x < labelX + w / 2) && (y > labelY - h / 2 && y < labelY + h / 2);
    }

    setText(newText) {
        this.text = newText;
    }

    getText() {
        return this.text;
    }
}

class Edge {
    static edges = [];
    constructor(startVertex, endVertex, maxValue = 10, width = 4) {
        this.startVertex = startVertex;
        this.endVertex = endVertex;
        this.maxValue = maxValue;
        this.width = width;
        this.ghost = false;
        this.selected = false;

        this.headLength = 20;

        Edge.edges.push(this);

        this.oldStartX = null;
        this.oldStartY = null;
        this.oldEndX = null;
        this.oldEndY = null
        
        this.textLocation = 0.5; // процент от отрезка

        this.text = String(maxValue);
        this.commonMath(true);

        this.maxValue = maxValue;
        this.curValue = 0;

        this.drawText = true;
        this.showCurValue = false;

        this.active = false;
        this.activeColor = 'red';
    }

    remove() {
        Edge.edges = Edge.edges.filter(edge => edge !== this);

        this.startVertex.edges = this.startVertex.edges.filter(edge => edge !== this);

        if (this.endVertex) {
            this.endVertex.edgesTo = this.endVertex.edgesTo.filter(edge => edge!== this);
        }
    }
    
    commonMath(countAnyway = false) {
        if (!this.startVertex || !this.endVertex) {
            return;
        }

        if (countAnyway || this.oldStartX != this.startVertex.x || this.oldStartY != this.startVertex.y || this.oldEndX != this.endVertex.x || this.oldEndY != this.endVertex.y) {
            this.oldStartX = this.startVertex.x;
            this.oldStartY = this.startVertex.y;
            this.oldEndX = this.endVertex.x;
            this.oldEndY = this.endVertex.y

            this.len = Math.sqrt(Math.pow(this.endVertex.x - this.startVertex.x, 2) + Math.pow(this.endVertex.y - this.startVertex.y, 2));
            this.dx = (this.endVertex.x - this.startVertex.x) / this.len;
            this.dy = (this.endVertex.y - this.startVertex.y) / this.len;

            this.startX = this.startVertex.x + this.dx * this.startVertex.radius;
            this.startY = this.startVertex.y + this.dy * this.startVertex.radius;
            this.endX = this.endVertex.x - this.dx * this.endVertex.radius;
            this.endY = this.endVertex.y - this.dy * this.endVertex.radius;

            this.angle = Math.atan2(this.dy, this.dx);

            this.triangle1X = this.endX; this.triangle1Y = this.endY;
            this.triangle2X = this.endX - this.headLength * Math.cos(this.angle - Math.PI / 6);
            this.triangle2Y = this.endY - this.headLength * Math.sin(this.angle - Math.PI / 6);
            this.triangle3X = this.endX - this.headLength * Math.cos(this.angle + Math.PI / 6);
            this.triangle3Y = this.endY - this.headLength * Math.sin(this.angle + Math.PI / 6);

            this.x = this.startX - (this.startX - this.endX) * this.textLocation;
            this.y = this.startY - (this.startY - this.endY) * this.textLocation;
        }
    }

    getHeadPath() {
        this.commonMath();
        let path = new Path2D();
        path.moveTo(this.triangle1X, this.triangle1Y);
        path.lineTo(this.triangle2X, this.triangle2Y);
        path.lineTo(this.triangle3X, this.triangle3Y);

        return path;
    }
    
    getLinePath(widthScale = 1) {

        this.commonMath();
        let path = new Path2D();
        path.moveTo(this.startX, this.startY);
        path.lineTo(this.endX - this.dx * this.headLength/2, this.endY - this.dy * this.headLength/2);

        return path;
        
    }
    
    pointOnHead(x,y) {
        if (!this.startVertex || !this.endVertex) {
            return false;
        }
        const path = this.getHeadPath();
        return ctx.isPointInPath(path, x, y);
    }
    
    pointOnLine(x,y) {
        if (!this.startVertex || !this.endVertex) {
            return false;
        }
        
        const path = this.getLinePath(2);
        // ctx.lineWidth = this.width * 2;
        const origLineWidth = ctx.lineWidth;
        ctx.lineWidth = this.width + lineTolerance;
        const result = ctx.isPointInStroke(path, x, y);
        ctx.lineWidth = origLineWidth;
        return result; 
    }

    getDispText(allText = false) {
        return this.showCurValue || allText ? `${this.curValue}/${this.maxValue}` : `${this.maxValue}`;
    }
    pointOnText(x,y) {
        if (!this.startVertex || !this.endVertex) {
            return false;
        }

        this.commonMath();

        const text = this.getDispText();

        const {width, height} = textSize(text);
        
        return Math.abs(x-this.x) < width/2 && Math.abs(y-this.y) < height/2;
    }

    pointOnEdge(x,y) {
        return this.pointOnHead(x,y) || this.pointOnLine(x,y) || this.pointOnText(x,y);
    }

    draw(ctx, drawAll = false) {
        if (!this.startVertex || !this.endVertex) {
            return;
        }

        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';

        if (selectedObject === this && !drawAll) {
            ctx.strokeStyle = 'blue';
            ctx.fillStyle = 'blue';
        }
        if (this.startVertex.ghost || this.endVertex.ghost || this.ghost) {
            // Set the line dash pattern
            ctx.setLineDash([5, 10]); // [dash length, gap length]
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
        }

        let textColor = "black";

        if (drawAll && this.active) {
            ctx.strokeStyle = this.activeColor;
            ctx.fillStyle = this.activeColor;
            textColor = this.activeColor;
        }

        // Draw the line
        const path = this.getLinePath()
        ctx.lineWidth = this.width;

        ctx.stroke(path);
        ctx.setLineDash([])

        // Draw the arrow head
        const headPath = this.getHeadPath();
        ctx.fill(headPath);

        if (this.drawText) {
            const text = this.getDispText(drawAll);
            drawTextCentered(ctx, text, this.x, this.y, "bold 16pt Courier", textColor);
        }
    }

    setText(newText) {
        this.maxValue = parseInt(newText);
    }

    getText() {
        return this.maxValue;
    }
}

function textSize(text, font = "bold 18pt Courier") {
    ctx.font = font;        

    const metrics = ctx.measureText(text);
    const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const textWidth = metrics.width;

    return {
        height: actualHeight,
        width: textWidth
    };
}

function drawTextCentered(ctx, text, x, y, font = "bold 18pt Courier", textColor = 'black', background = 'white') {
    ctx.font = font;        

    const {height, width} = textSize(text, font);

    const padding = 3;

    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect(x - width / 2 - padding, y - height / 2 - padding, width + padding * 2, height + padding * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText(text, x - width / 2, y + height / 2); 

}

const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');

const inputElement = document.getElementById('textInput');

inputElement.style.visibility = 'hidden';



// Для перетаскивания
let wasDragging = false;
let mousePressed = false;
let offsetX, offsetY;
let dragSomething = false;


// Для создания вершины
let mouseDownOnBorder = false;
let mouseDownOnVertex = false;
let creating = false;
let prevVertex;
let vertexToCreate;
let draggedEdge;
let newEdge;
let hoverOver;

let mouseDownOnVertexLabel = false;
let vertexToDragLabel;

let selectedObject;
let prevSelection;
// let selectedObject;

// Для перетаскивания ребра
let dummyVertex; 
let edgeDragging;
let mouseDownOnHead = false;
let mouseDownOnEdge = false;

// Для перетаскивания текста
let mouseDownOnEdgeText = false;
let edgeToDragText;


// Создаем две начальные вершины
const vertices = Vertex.vertices;

var startVertex = new Vertex(100, 200, 's');
var endVertex = new Vertex(600, 200, 't');
  
let textInputInfo = {
    text: 'Initial Text',
    object: null,
    x: 100,
    y: 100
};

function changeSelection(object) {
    prevSelection = selectedObject;
    selectedObject = object;
}

function drawVertices(ctx, drawAll = false) {
    Vertex.vertices.forEach(vertex => vertex.draw(ctx, drawAll));
}

function drawEdges(ctx, drawAll = false) {
    Edge.edges.forEach(edge => edge.draw(ctx, drawAll));
}

function onUpdate(ctx_ = null) {
    if (!ctx_) {
        ctx_ = ctx;
    }
    ctx_.clearRect(0, 0, canvas.width, canvas.height); // Очищаем холст перед отрисовкой
    drawEdges(ctx_);
    drawVertices(ctx_);
}


function moveVertex(vertex, x, y) {
    vertex.x = x;
    vertex.y = y;

    if (creating) {
        if(hoverOver = Vertex.vertices.find(vertex => {
            return vertex.pointIn(x, y) && vertex!== selectedObject;
        })) {
            if (newEdge) {
                if (hoverOver === prevVertex) {
                    newEdge.endVertex = null;
                } else {
                    newEdge.endVertex = hoverOver;
                }
            }
            selectedObject.visible = false;
        } else {
            if (newEdge) {
                newEdge.endVertex = vertexToCreate;
            }
            selectedObject.visible = true;
        }
    }
}

function startVertexCreation(x, y, fromVertex = null) {
    if (creating) {
        return;
    }

    vertexToCreate = new Vertex(x, y);
    prevVertex = fromVertex;
    changeSelection(vertexToCreate);
    vertexToCreate.ghost = true;
    creating = true;


    if (fromVertex) {
        fromVertex.edges.push(newEdge = new Edge(fromVertex, vertexToCreate));
        newEdge.ghost = true;
    }
}

function endVertexCreation(terminate = false) {
    if (!creating) {
        return;
    }
    
    // если он видимый, значит, можно создать
    if (!terminate && vertexToCreate.visible) {

        vertexToCreate.ghost = false;
    } else { 
        // иначе он может быть над другой вершиной или вышел за границы
        if (newEdge && hoverOver && hoverOver!== prevVertex) {
            newEdge.endVertex = hoverOver;
        } else {
            newEdge.remove();
        }
        vertexToCreate.remove()
    }
    
    if (newEdge && newEdge.endVertex) {
        newEdge.endVertex.edgesTo.push(newEdge);
        newEdge.ghost = false;
    }
    prevVertex = null;
    vertexToCreate = null;
    creating = false;
    newEdge = null;
}

function moveVertexLabel(vertex, x, y) {

    vertex.labelAngle = Math.atan2(vertex.y - y, vertex.x - x);
}

function endVertexLabelMove() {
    vertexToDragLabel = null;
}

function dragEdge(edge, x, y) {    
    edge.endVertex = dummyVertex;
    
    const dist = Math.hypot(x - edge.startVertex.x, y - edge.startVertex.y);
    const angle = Math.atan2(y - edge.startVertex.y, x - edge.startVertex.x);
    
    // 1
    // const curDistToEnd = edge.origDistToEnd * (dist / edge.origMouseDist);
    // edge.endVertex.x = edge.startVertex.x + curDistToEnd * Math.cos(angle + edge.origAngle);
    // edge.endVertex.y = edge.startVertex.y + curDistToEnd * Math.sin(angle + edge.origAngle);
    
    // 2
    const distToHeadEnd = edge.mouseHeadEndDist * Math.cos(edge.origAngle);
    const mdProj = dist * Math.cos(edge.origAngle);
    const headDist = edge.mouseHeadEndDist * Math.cos(Math.asin(dist * Math.sin(edge.origAngle)/edge.mouseHeadEndDist)) + mdProj;
    const wholeDist = headDist  + edge.endVertex.radius;
    const headX = edge.startVertex.x + headDist * Math.cos(angle + edge.origAngle);
    const headY = edge.startVertex.y + headDist * Math.sin(angle + edge.origAngle);
    edge.endVertex.x = edge.startVertex.x + wholeDist * Math.cos(angle + edge.origAngle);
    edge.endVertex.y = edge.startVertex.y + wholeDist * Math.sin(angle + edge.origAngle);

    // 3
    // const wholeDist = dist + edge.endVertex.radius;
    // edge.endVertex.x = edge.startVertex.x + wholeDist * Math.cos(angle);
    // edge.endVertex.y = edge.startVertex.y + wholeDist * Math.sin(angle);
    
    
    if (hoverOver = Vertex.vertices.find(vertex => {
        return (vertex.pointIn(x, y) || vertex.pointIn(headX, headY)) && vertex !== edge.startVertex ;
    })) {
        edge.endVertex = hoverOver;
        
        edge.commonMath(true);
        return;
    }
    edge.commonMath(true);
}

function startEdgeDragging(edge, mouseX, mouseY) {
    edge.endVertex.edgesTo = edge.endVertex.edgesTo.filter(e => e!== edge);
    draggedEdge = edge;
    dummyVertex = Object.assign(Object.create(Object.getPrototypeOf(edge.endVertex)), edge.endVertex);
    dummyVertex.symbol = '*';
    dummyVertex.symboled = true;
    dummyVertex.visible = false;

    // dummyVertex.ghost = true;
    draggedEdge.ghost = true;
    draggedEdge.endVertex = dummyVertex;

    edgeDragging = true;

    vertexToCreate = dummyVertex;
    newEdge = edge;
    changeSelection(edge);


    edge.origDistToEnd = Math.hypot(edge.startVertex.x - edge.endVertex.x, edge.startVertex.y - edge.endVertex.y);
    edge.origMouseDist = Math.hypot(edge.startVertex.x - mouseX, edge.startVertex.y - mouseY);
    // edge.mouseEndDist = Math.hypot(edge.endVertex.x - mouseX, edge.endVertex.y - mouseY);
    // angle between startVertex-mouse and startVertex-endVertex
    edge.origAngle = Math.atan2(edge.endVertex.y - edge.startVertex.y, edge.endVertex.x - edge.startVertex.x) - Math.atan2(mouseY - edge.startVertex.y, mouseX - edge.startVertex.x);
    // расстояние между курсором-началом ребра и концом стрелки
    edge.mouseHeadEndDist = Math.sqrt(Math.pow(edge.origMouseDist,2) + Math.pow(edge.origDistToEnd - edge.endVertex.radius,2)
        - 2 * edge.origMouseDist * (edge.origDistToEnd - edge.endVertex.radius) * Math.cos(edge.origAngle));
}

function endEdgeDragging() {
    if (!edgeDragging) {
        return;
    }

    if (hoverOver && hoverOver !== draggedEdge.startVertex) {
        draggedEdge.endVertex = hoverOver;
        draggedEdge.endVertex.edgesTo.push(draggedEdge);
    } else {
        draggedEdge.remove();
    }

    dummyVertex.edges = [];
    dummyVertex.edgesTo = [];
    dummyVertex.remove();

    draggedEdge.ghost = false;
    draggedEdge = null;
    dummyVertex = null;
    edgeDragging = false;
    vertexToCreate = null;
    newEdge = null;
}

function mouseReset() {
    mouseDownOnBorder = false;
    mouseDownOnVertex = false;
    mouseDownOnHead = false;
    mouseDownOnEdge = false;
    mouseDownOnEdgeText = false;
    mouseDownOnVertexLabel = false;

    dragSomething = false;
    canvas.style.cursor = 'default';
}

function dragEdgeTextStart(edge) {
    edgeToDragText = edge;
}

function adjustVertexForMagnet(vertex) {
    const closestX = Vertex.vertices.reduce((prev, curr) => {
        const dist = Math.abs(curr.x - vertex.x);
        return dist < prev.dist && curr !== vertex ? {vertex: curr, dist: dist} : prev;
    }, {dist: Infinity});

    const closestY = Vertex.vertices.reduce((prev, curr) => {
        const dist = Math.abs(curr.y - vertex.y);
        return dist < prev.dist && curr !== vertex ? {vertex: curr, dist: dist} : prev;
    }, {dist: Infinity});
    
    if (closestX.dist < magnetPower) {
        vertex.x = closestX.vertex.x;
    }

    if (closestY.dist < magnetPower) {
        vertex.y = closestY.vertex.y;
    }

    const sameVertex = Vertex.vertices.find(v => {
        return v.x === vertex.x && v.y === vertex.y && v !== vertex;
    });

    if (sameVertex) {
        hoverOver = sameVertex;
        selectedObject.visible = false;
    } else {
        selectedObject.visible = true;
    }
}

function dragEdgeText(edge, x, y) {
    // find closest point on edge to mouse
    const dist = Math.hypot(x - edge.startVertex.x, y - edge.startVertex.y);
    const angle = Math.atan2(y - edge.startVertex.y, x - edge.startVertex.x);
    const proj = dist * Math.cos(angle - edge.angle);

    edge.textLocation = Math.min(1,Math.max(proj / edge.len, 0));
    edge.commonMath(true);
}

function dragEdgeTextEnd() {
    edgeToDragText = null;
}

// Обработчик события mousedown для начала перетаскивания
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    mousePressed = true;

    // Проверяем, находится ли курсор внутри радиуса вершины
    changeSelection(Vertex.vertices.find(vertex => {
        return vertex.pointIn(mouseX, mouseY);
    }));
    
    
    mouseReset();

    if (selectedObject instanceof Vertex) {
        mouseDownOnVertex = true;
        if (selectedObject.pointOnLabel(mouseX, mouseY)) {
            mouseDownOnVertexLabel = true;
        } else {
            
            if (selectedObject.pointOnBorder(mouseX, mouseY)) {
                mouseDownOnBorder = true;
            }
            selectedObject.dragging = true; 
            offsetX = mouseX - selectedObject.x; 
            offsetY = mouseY - selectedObject.y;
            
            wasDragging = false;
        }
        // ctx.canvas.style.cursor = 'grabbing';

    } else { // обработка взаимодействия с ребрами

        
        draggedEdge = Edge.edges.find(edge => {
            return edge.pointOnHead(mouseX, mouseY);
        }); 
        
        const edgeTextUnder = Edge.edges.find(edge => {
            return edge.pointOnText(mouseX, mouseY);
        });
        

        // сначала проверяем, есть ли текст
        if (edgeTextUnder) {
            mouseDownOnEdgeText = true;
            changeSelection(edgeTextUnder);
        } else {
            // потом проверяем, есть ли стрелка, чтобы тягать ребро
            if (draggedEdge) {
                mouseDownOnHead = true;
                changeSelection(draggedEdge);  
            } else {
                // и последним проверим, есть ли ребро под курсором
                changeSelection(Edge.edges.find(edge => {
                    return edge.pointOnLine(mouseX, mouseY);
                }));
                
            }
        }
    }
    
    onUpdate();
});

// Обработчик события mousemove для перемещения выбранной вершины
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const dx = e.movementX;
    const dy = e.movementY;

    if (mouseDownOnVertexLabel) {
        vertexToDragLabel = selectedObject;
        mouseDownOnVertexLabel = false;
    }

    if (mouseDownOnBorder) {
        startVertexCreation(mouseX, mouseY, selectedObject);
        mouseDownOnBorder = false;
    }

    if (mouseDownOnEdgeText) {
        dragEdgeTextStart(selectedObject);
        mouseDownOnEdgeText = false;
    }

    if (selectedObject && mousePressed && !vertexToDragLabel) {
        if (selectedObject instanceof Vertex) { 
            moveVertex(selectedObject, mouseX - offsetX, mouseY - offsetY);
            if (e.shiftKey) {
                adjustVertexForMagnet(selectedObject);
            }
        }
 
        dragSomething = true;
        wasDragging = true;     
        
    }
    
    if (mouseDownOnHead) {
        startEdgeDragging(draggedEdge, mouseX, mouseY);
        mouseDownOnHead = false;
    }
    
    if (vertexToDragLabel) {
        dragSomething = true;
        moveVertexLabel(vertexToDragLabel, mouseX, mouseY);
    }
    
    if (edgeToDragText) {
        dragSomething = true;
        dragEdgeText(edgeToDragText, mouseX, mouseY);
    }
    
    if (edgeDragging) {
        dragSomething = true;
        dragEdge(draggedEdge, mouseX, mouseY);
    }

    onUpdate();
    // findSolution();
});
  
// Обработчик события mouseup для окончания перетаскивания
canvas.addEventListener('mouseup', () => {
    if (selectedObject) {
        selectedObject.dragging = false; // Сбрасываем флаг перетаскивания

    }
    mouseReset();
    endVertexCreation();
    endEdgeDragging();
    dragEdgeTextEnd();
    endVertexLabelMove();

    mousePressed = false;

    onUpdate();
    findSolution();
});

canvas.addEventListener('mouseleave', () => {
    if (selectedObject) {
        selectedObject.dragging = false; // Сбрасываем флаг перетаскивания
        changeSelection(null); // Сбрасываем флаг выбора
        endVertexCreation(true);

    }
    mouseReset();
    hoverOver = null;
    onUpdate();
    // findSolution();
});

function showTextInput(x,y, object) {
    textInputInfo.text = object.getText();
    textInputInfo.object = object;
    const rect = canvas.getBoundingClientRect();
    inputElement.style.visibility = 'visible';
    inputElement.style.left = `${x + rect.left}px`;
    inputElement.style.top = `${y + rect.top}px`;
    inputElement.value = object.text;
    inputElement.select();
    object.drawText = false;
}

canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // if (selectedObject) {

    //     return;
    // }

    // Проверяем, находится ли курсор внутри радиуса вершины
    const curVertex = Vertex.vertices.find(vertex => {
        return vertex.pointIn(mouseX, mouseY);
    });

    const curEdge = Edge.edges.find(edge => {
        return edge.pointOnEdge(mouseX, mouseY);;
    });

    if (curVertex) {
        showTextInput(curVertex.x, curVertex.y, curVertex);
    } else if (curEdge) {
        showTextInput(curEdge.x, curEdge.y, curEdge);
    } else {
        startVertexCreation(mouseX, mouseY);
        endVertexCreation();

    }

    onUpdate();
});

function hideTextInput(success = true) {
    inputElement.style.visibility = 'hidden';

    if (success) {
        textInputInfo.object.setText(inputElement.value);
    } else {
        textInputInfo.object.setText(textInputInfo.text);
    }

    textInputInfo.object.drawText = true;
    onUpdate();
    findSolution();
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Delete') {
        if (selectedObject) {
            selectedObject.remove();
            onUpdate();
            findSolution();
        }
    }
});

inputElement.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        
        hideTextInput();
    } else if (e.key === 'Escape') {
        hideTextInput(false);
    }

});

inputElement.addEventListener('focusout', () => {
    hideTextInput();
});


function checkPathExistence(startVertex, endVertex) {
    let queue = [];
    let visited = [];
    queue.push(startVertex);
    visited.push(startVertex);

    while (queue.length) {
        let vertex = queue.shift();
        if (vertex === endVertex) {
            return true;
        }

        vertex.edges.forEach(edge => {
            if (edge.endVertex && !visited.includes(edge.endVertex)) {
                visited.push(edge.endVertex);
                queue.push(edge.endVertex);
            }
        });

    }
    return false;
}

function dfs(vertex, visited, recStack) {
    if (recStack.includes(vertex)) {
        return false;
    }
    if (visited.includes(vertex)) {
        return true;
    }

    recStack.push(vertex);
    visited.push(vertex);

    vertex.edges.forEach(edge => {
        if (edge.endVertex) {
            if (!dfs(edge.endVertex, visited, recStack))
                return false
        }
    });

    recStack.pop();

    return true;
}

// true if cycles don't exist, false otherwise
function checkCycles() {
    let queue = [];
    let visited = [];
    let recStack = [];
    
    if (!dfs(startVertex, visited, recStack)) {
        return false;
    }

    return true;
}

function findMinPath() {
    Vertex.vertices.forEach(vertex => {
        vertex.label = '';
    });

    let queue = [];
    let visited = [];
    let minPath = [];
    let minPathLength = Infinity;

    let minFlow = Infinity;
    queue.push(startVertex);

    startVertex.label = 0;

    while (queue.length) {
        let vertex = queue.shift();
        visited.push(vertex);
        
        vertex.edges.forEach(edge => {
            if (edge.endVertex && (edge.curValue < edge.maxValue)) {
                if (!visited.includes(edge.endVertex) && edge.endVertex.label === '')  {
                    queue.push(edge.endVertex);
                    edge.endVertex.label = vertex.label + 1;
                }
            }
        });

        vertex.edgesTo.forEach(edge => {
            if (edge.startVertex && (edge.curValue > 0)) {
                if (!visited.includes(edge.startVertex) && edge.startVertex.label === '')  {
                    queue.push(edge.startVertex);
                    edge.startVertex.label = vertex.label + 1;
                }
            }
        });
    }

    let exist = false;
    if (endVertex.label !== '') {
        exist = true;
    }

    let vertices = [];
    let edges = [];

    if (exist) {
        let vertex = endVertex;
        let prevVertex = null;
        let invert = false;
        let curEdge = null;
        while (vertex.label!== 0) {
            invert = false;
            curEdge = vertex.edgesTo.find(edge => edge.startVertex.label == vertex.label - 1 && edge.curValue < edge.maxValue);
            
            if (!curEdge) {
                curEdge = vertex.edges.find(edge => edge.endVertex.label == vertex.label - 1 && edge.curValue > 0);
                invert = true;
            }

            if (invert) {
                prevVertex = curEdge.endVertex;
                curEdge.invert = true;
                minFlow = Math.min(minFlow, curEdge.curValue);
                // console.log(curEdge.curValue);

            } else {
                prevVertex = curEdge.startVertex;
                curEdge.invert = false;
                minFlow = Math.min(minFlow, curEdge.maxValue - curEdge.curValue);
                // console.log(curEdge.maxValue, curEdge.curValue);
            }
            if (minFlow === 0) {
                console.log('minFlow === 0');
                exist = false;
                break;
            }
            edges.unshift(curEdge);
            vertices.unshift(vertex);
            vertex = prevVertex;
        }
        vertices.unshift(startVertex);
    }

    return {
        exist,
        minFlow,
        vertices,
        edges
    }
}

function findSolution() {
    let pathExistence = document.getElementById('pathExistence');
    // let cycleExistence = document.getElementById('cycleExistence');

    let pathExist = checkPathExistence(startVertex, endVertex);
    if (pathExist) {
        pathExistence.textContent = 'Path exists';
    } else {
        pathExistence.textContent = 'Path does not exist';
    }

    // let cycles = checkCycles();
    // if (cycles) {
    //     cycleExistence.textContent = 'Cycle does not exist';
    // } else {
    //     cycleExistence.textContent = 'Cycle exists';
    // }

    if (pathExist) {
        pathExistence.style.color = 'green';
    } else {
        pathExistence.style.color ='red';
    }
    // if (cycles) {
    //     cycleExistence.style.color = 'green';
    // } else {
    //     cycleExistence.style.color ='red';
    // }
    document.getElementById('steps').innerHTML = '';
    let steps = document.getElementById('steps');
    // if (!pathExist ||!cycles) {
    //     return;
    // }
    Edge.edges.forEach(edge => {
        edge.curValue = 0;
    });

    let path = null;
    let flow = 0;

    

    path = findMinPath();

    while (path.exist) {
        // console.log('path', path);
        Edge.edges.forEach(edge => {
            edge.active = false;
        });

        path.edges.forEach(edge => {
            edge.curValue = edge.invert ? edge.curValue - path.minFlow : edge.curValue + path.minFlow;
            edge.active = true;
        });

        flow += path.minFlow;

        var canvasWidth = canvas.width;
        var canvasHeight = canvas.height;

        var divBlock = document.createElement('div');
        var newCanvas = document.createElement('canvas');
        newCanvas.setAttribute('width', `${canvasWidth}`);
        newCanvas.setAttribute('height', `${canvasHeight}`);

        newCtx = newCanvas.getContext('2d');

        let str = '';
        path.vertices.forEach(vertex => {
            str += vertex.text + '-';
        });
        str = str.slice(0, -1);

        var newParagraph = document.createElement('p');
        newParagraph.textContent = `Путь: ${str}`;
        var newParagraph2 = document.createElement('p');
        newParagraph2.textContent = `Увеличиваем поток на ${path.minFlow}. Текущий поток: ${flow}`;

        divBlock.appendChild(newCanvas);
        divBlock.appendChild(newParagraph);
        divBlock.appendChild(newParagraph2);

        steps.appendChild(divBlock);

        drawEdges(newCtx, true);
        drawVertices(newCtx, true);

        path = findMinPath();

    }
}


// var newParagraph = document.createElement('p');
// newParagraph.setAttribute('id', 'pathExistence');
// newParagraph.textContent = 'This is a new paragraph.';
// document.getElementById('task').appendChild(newParagraph);

onUpdate();


function updateCursorStyle(event) {
    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    let cursorStyle = 'default'

    for (let vertex of Vertex.vertices) {
        // const dx = mouseX - vertex.x
        // const dy = mouseY - vertex.y
        // const distance = Math.sqrt(dx * dx + dy * dy)

        if (vertex.pointIn(mouseX, mouseY)) {
            if (vertex.pointOnBorder(mouseX, mouseY)) {
                cursorStyle = 'crosshair'
            } else {
                cursorStyle = 'move'
            }
            break
        }
    }

    for (let edge of Edge.edges) {
        if (edge.pointOnEdge(mouseX, mouseY)) {
            if (edge.pointOnHead(mouseX, mouseY)) {
                cursorStyle = 'grab'
            } else {
                cursorStyle = 'pointer'
            }
            break
        }
    }
    
    if (dragSomething) {
        cursorStyle = 'grabbing'
    }

    canvas.style.cursor = cursorStyle
}

canvas.addEventListener('mousemove', updateCursorStyle)
