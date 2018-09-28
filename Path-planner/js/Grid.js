class Grid {

    constructor(canvas_id, width, height) {
        this.CIRCLE = 'TYPE_CIRCLE';
        this.RECT = 'TYPE_RECT';
        this.LINE = 'TYPE_LINE';
        this.TEXT = 'TYPE_TEXT';

        this.UP = 'DIR_UP';
        this.DOWN = 'DIR_DOWN';
        this.LEFT = 'DIR_LEFT';
        this.RIGHT = 'DIR_RIGHT';

        this.MAX = 1.0;
        this.BIG = 0.8;
        this.MEDIUM = 0.6;
        this.MEDIUM_SMALL = 0.4;
        this.SMALL = 0.3;
        this.SMALLER = 0.2;
        this.MIN = 0.1;

        this.canvas_id = canvas_id;
        this.canvas_obj = document.getElementById(this.canvas_id);
        this.canvas_obj.setAttribute("width", width);
        this.canvas_obj.setAttribute("height", height);
        this.context = this.canvas_obj.getContext("2d");

        this.potential_labels = false;
        this.repulsive_value = 30;
        this.distance_of_influence = 1;
        this.probabilistic_nodes = 10;

        this.reader = new FileReader();

        // Canvas size and cell number
        this.size = {
            x: -1,
            y: -1
        };

        // Default pixel distance between grid cells
        this.setSpacing(1, 1);

        // Color configurations
        this.darkTheme();

        // Cell size info
        this.cellSideLength = 30;
        this.cell_width = null;
        this.cell_height = null;
        this.grid_matrix = null;
        this.wall_map = null;

        // Objects in the grid
        this.objects = null;
        this.adjacency_graph = null;

        // Listeners
        this.canvas_obj.addEventListener("mousemove", this.onMouseMove.bind(null, this));
        this.canvas_obj.addEventListener("mousedown", this.onMouseDown.bind(null, this));
        this.canvas_obj.addEventListener("mouseup", this.onMouseUp.bind(null, this));
        this.canvas_obj.addEventListener("click", this.onMouseClick.bind(null, this));
        this.canvas_obj.addEventListener("contextmenu", this.onMouseRightClick.bind(null, this));

        // Mouse status helpers
        this.mouseIsDown = false;
        this.mouseWasDragged = false;
        this.lastCellMouseOver = null;
        this.mouseDragAction = null;
        this.positionEndPoint = false;

        // Others
        this.algorithm = null;

        // used to enable path drawing only if there is an actual path to redraw
        this.drawPath = false;
    }

    increaseCellsSize(button) {
        this.cellSideLength += 10;
        this.canvas_obj.setAttribute("width", parseInt(this.canvas_obj.getAttribute("width")) + 15);
        this.canvas_obj.setAttribute("height", parseInt(this.canvas_obj.getAttribute("height")) + 15);
        this.clearCanvas();
        this.generate();
        this.updateGraphics();

        if (this.cellSideLength == 70) {
            button.disabled = true;
        }
        document.getElementById("decreaseCellsSize").disabled = false;
    }

    decreaseCellsSize(button) {
        this.cellSideLength -= 10;
        this.canvas_obj.setAttribute("width", parseInt(this.canvas_obj.getAttribute("width")) - 15);
        this.canvas_obj.setAttribute("height", parseInt(this.canvas_obj.getAttribute("height")) - 15);
        this.clearCanvas();
        this.generate();
        this.updateGraphics();

        if (this.cellSideLength == 30) {
            button.disabled = true;
        }

        document.getElementById("increaseCellsSize").disabled = false;
    }

    // Generate the grid based on setting specified before
    generate() {
        if (this.size.x == null || this.size.y == null) {
            log.error("Missing size parameters.");
            return false;
        }

        var x = Math.ceil(((this.canvas_obj.width - this.spacing_x) / this.cellSideLength) - this.spacing_x);
        var y = Math.ceil(((this.canvas_obj.height - this.spacing_y) / this.cellSideLength) - this.spacing_y);

        var cell_n = {
            x: x,
            y: y
        };

        this.size = cell_n;

        // Calculate size in pixel based on dimensions and number of cells
        this.cell_width = (this.canvas_obj.width - this.spacing_x) / (cell_n.x + this.spacing_x);
        this.cell_height = (this.canvas_obj.height - this.spacing_y) / (cell_n.y + this.spacing_y);

        this.grid_matrix = [];
        this.wall_map = [];

        for (var i = 0; i < this.size.x; i++) {
            this.wall_map[i] = [];
            this.grid_matrix[i] = [];

            for (var j = 0; j < this.size.y; j++) {
                this.wall_map[i][j] = 0;
                this.grid_matrix[i][j] = {
                    x: this.spacing_x + i * (this.cell_width + this.spacing_x),
                    y: this.spacing_y + j * (this.cell_height + this.spacing_y)
                };
            }
        }

        this.objects = {};
        this.drawPath = false;
        this.updateGraphics();
    }



    // GETTERS and SETTERS
    setSize(size_x, size_y) {
        this.size.x = size_x;
        this.size.y = size_y;
    }
    setSpacing(spacing_x, spacing_y) {
        this.spacing_x = spacing_x;
        this.spacing_y = spacing_y;
    }
    setAlgorithm(algorithm) {
        this.algorithm = algorithm;
    }
    darkTheme(refresh = false) {
        this.WALL_COLOR = "#d5a76b";
        this.BG_COLOR = "#aaaaaa";
        this.START_COLOR = "#00ff00";
        this.END_COLOR = "#ff0000";
        this.LINE_COLOR = "#b18ec5";
        this.PATH_COLOR = "#b18ec5";
        this.BEST_PATH_COLOR = "green";
        this.CELL_COLOR = "#142b3f";
        this.OBSTACLE_EDGE_COLOR = "#996600";
        this.WALL_BORDER = "white";

        if (refresh) this.updateGraphics();
    }
    lightTheme(refresh = false) {
        this.WALL_COLOR = "#d5a76b";
        this.BG_COLOR = "gray";
        this.START_COLOR = "#00ff00";
        this.END_COLOR = "#ff0000";
        this.LINE_COLOR = "#b18ec5";
        this.PATH_COLOR = "#b18ec5";
        this.BEST_PATH_COLOR = "green";
        this.CELL_COLOR = "#f4f4f4";
        this.OBSTACLE_EDGE_COLOR = "#996600";
        this.WALL_BORDER = "gray"

        if (refresh) this.updateGraphics();
    }



    // DRAWING UTILS
    clearCanvas() {
        this.context.clearRect(0, 0, this.canvas_obj.width, this.canvas_obj.height);
    }

    drawBackground() {
        this.context.fillStyle = this.BG_COLOR;
        this.context.fillRect(0, 0, this.canvas_obj.width, this.canvas_obj.height);
    }

    drawCells() {
        for (var i = 0; i < this.grid_matrix.length; i++) {
            for (var j = 0; j < this.grid_matrix[i].length; j++) {

                var cell = this.grid_matrix[i][j];

                this.context.fillStyle = this.CELL_COLOR;
                this.context.fillRect(cell.x, cell.y, this.cell_width, this.cell_height);
            }
        }
    }

    drawObjects() {
        if (this.objects == null) {
            return;
        }

        for (var key in this.objects) {
            var obj = this.objects[key];

            switch (obj.type) {
                case this.RECT:
                    this.drawRect(obj);
                    break;

                case this.CIRCLE:
                    this.drawCircle(obj);
                    break;

                case this.LINE:
                    this.drawLine(obj);
                    break;

                case this.TEXT:
                    this.drawText(obj);
                    break;

                default:
                    log.error("Uknown object type '" + obj.type + "'.");
            }
        }
    }

    drawRect(obj) {
        var cell = this.grid_matrix[obj.x][obj.y];

        var size = {
            x: this.cell_width * obj.size,
            y: this.cell_height * obj.size
        }

        var pos = {
            x: cell.x + (this.cell_width - size.x) / 2,
            y: cell.y + (this.cell_height - size.y) / 2
        }

        this.context.fillStyle = obj.color;
        this.context.fillRect(pos.x, pos.y, size.x, size.y);
        this.context.lineWidth = 3;
        this.context.strokeStyle = this.WALL_BORDER;
        this.context.strokeRect(pos.x, pos.y, size.x, size.y);
    }

    drawCircle(obj) {
        var cell = this.grid_matrix[obj.x][obj.y];

        var radius = this.cell_width < this.cell_height ?
            (this.cell_width / 2) * obj.size :
            (this.cell_height / 2) * obj.size;

        var pos = {
            x: cell.x + (this.cell_width / 2),
            y: cell.y + (this.cell_height / 2)
        }

        this.context.fillStyle = obj.color;
        this.context.strokeStyle = obj.color;
        this.context.lineWidth = 0;
        this.context.beginPath();
        this.context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        this.context.fill();
        this.context.closePath();
    }

    drawLine(obj) {
        if (obj.pointList.length <= 1) {
            return;
        }

        this.context.strokeStyle = obj.color;
        this.context.lineWidth = (this.cell_height / 2) * obj.size;
        this.context.beginPath();

        for (var i = 0; i < obj.pointList.length; i++) {
            var cell = this.grid_matrix[obj.pointList[i].x][obj.pointList[i].y];
            var pos = {
                x: cell.x + this.cell_width / 2,
                y: cell.y + this.cell_height / 2
            }

            if (i == 0) {
                this.context.moveTo(pos.x, pos.y)
            } else {
                this.context.lineTo(pos.x, pos.y);
            }
        }

        this.context.stroke();
    }

    drawText(obj) {
        var cell = this.grid_matrix[obj.x][obj.y];

        var size = {
            x: this.cell_width * obj.size,
            y: this.cell_height * obj.size
        }

        var pos = {
            x: cell.x + (this.cell_width * 0.12),
            y: cell.y + (this.cell_height * 0.85)
        }

        this.context.fillStyle = obj.color;
        this.context.font = "8px Arial";
        this.context.fillText(obj.text, pos.x, pos.y);
    }

    updateGraphics() {
        this.clearCanvas();
        this.drawBackground();
        this.drawCells();
        this.drawObjects()
    }



    // OBJECTS CREATION/DESTRUCTION UTILS
    addObj(name, size, cell_x, cell_y, color, type, pointList, text) {
        if (this.objects == null) {
            log.error("Grid has to be generated yet");
            return;
        }

        if (this.objects[name]) {
            log.error("Name '" + name + "' already used by another object");
            return;
        }


        if (type != this.LINE && cell_x >= this.size.x || cell_y >= this.size.y) {
            log.error("point (" + cell_x + ", " + cell_y + ") outside of the grid.\n\tGrid size: ' + this.size.x + 'x' + this.size.y + '.");
            return;
        }

        if (type == this.LINE) {
            for (var i = 0; i < pointList.length; i++) {
                if (pointList[i].x >= this.size.x || pointList[i].y >= this.size.y) {
                    log.error("Point (" + pointList[i].x + ", " + pointList[i].y + ") in pointlist outside of the grid.\n\tGrid size: ' + this.size.x + 'x' + this.size.y + '.");
                    return;
                }
            }
        }

        var obj = {
            name: name,
            size: size,
            x: cell_x,
            y: cell_y,
            type: type,
            color: color,
            pointList: pointList,
            text: text
        }

        this.objects[name] = obj;

        this.updateGraphics();
    }

    removeObj(name) {
        if (this.objects == null) {
            log.error("Grid has to be generated yet");
            return;
        }

        if (this.objects[name]) {
            delete this.objects[name];
        } else {
            log.warn("Object '" + name + "' not found while trying to remove it.");
        }
        this.updateGraphics();
    }

    // do not use this for adding walls, use addWall
    addRect(name, size, cell_x, cell_y, color) {
        this.addObj(name, size, cell_x, cell_y, color, this.RECT, null, null);
    }

    addWall(cell_x, cell_y) {
        if (!this.cellIsWall(cell_x, cell_y)) {
            if (this.objects["start"] && cell_x == this.objects["start"].x && cell_y == this.objects["start"].y) {
                return;
            } else if (this.objects["end"] && cell_x == this.objects["end"].x && cell_y == this.objects["end"].y) {
                return;
            }

            var name = 'w' + cell_x + "-" + cell_y;

            this.addRect(name, this.MAX, cell_x, cell_y, this.WALL_COLOR);
            this.wall_map[cell_x][cell_y] = 1;

            this.evaluatePath();
        }
    }

    removeWall(cell_x, cell_y, evaluatePath = true) {
        if (this.cellIsWall(cell_x, cell_y)) {
            var name = 'w' + cell_x + "-" + cell_y;

            this.wall_map[cell_x][cell_y] = 0;
            this.removeObj(name);

            if (evaluatePath) {
                this.evaluatePath();
            }
        }
    }

    clearWalls() {
        for (var key in this.objects) {
            var obj = this.objects[key];
            if (obj.type == this.RECT) {
                this.removeWall(obj.x, obj.y, false);
            }
            if (obj.type == this.CIRCLE && obj.name != 'start' && obj.name != "end") {
                this.removeObj(obj.name);
            }
        }
        if (this.drawPath) {
            this.evaluatePath();
        }
    }

    toggleWall(cell_x, cell_y) {
        if (!this.cellIsWall(cell_x, cell_y))
            this.addWall(cell_x, cell_y);
        else
            this.removeWall(cell_x, cell_y);
    }

    addCircle(name, size, cell_x, cell_y, color) {
        this.addObj(name, size, cell_x, cell_y, color, this.CIRCLE, null, null);
    }

    // do not use this for adding path, use addPath
    addLine(name, size, color, pointList) {
        this.addObj(name, size, null, null, color, this.LINE, pointList, null);
    }

    addText(name, size, cell_x, cell_y, color, text) {
        this.addObj(name, size, cell_x, cell_y, color, this.TEXT, null, text);
    }

    removeAllText() {
        for (var key in this.objects) {
            if (this.objects[key].type == this.TEXT) {
                this.removeObj(key);
            }
        }
    }

    addPath(pointList, name, gridSize = grid.SMALLER, color = this.PATH_COLOR) {
        this.addLine(name, gridSize, color, pointList);
    }

    removePath(name) {
        this.removeObj(name);
    }

    clearPaths(drawPath = false) {
        for (var key in this.objects) {
            var obj = this.objects[key];
            if (obj.type == this.LINE) {
                this.removePath(obj.name);
            }
        }
        this.drawPath = drawPath;
        this.updateGraphics();
    }

    moveObject(name, direction) {
        var obj;

        if (obj = this.objects[name]) {

            if (obj.type != this.CIRCLE && obj.type != this.RECT) {
                log.error("Cannot move object type '" + obj.type + "'.");
                return;
            }

            var old_x = obj.x;
            var old_y = obj.y;

            switch (direction) {
                case this.UP:
                    obj.y -= 1;
                    break;

                case this.DOWN:
                    obj.y += 1;
                    break;

                case this.LEFT:
                    obj.x -= 1;
                    break;

                case this.RIGHT:
                    obj.x += 1;
                    break;

                default:
                    log.error("Direction unknown.");
            }

            // Check validity of movement
            if (obj.x < 0 || obj.x >= this.size.x || obj.y < 0 || obj.y >= this.size.y) {
                log.error("Invalid new position.");
                obj.x = old_x;
                obj.y = old_y;
            }

            this.updateGraphics();
            return;

        }

        log.error("Object name '" + name + "' not found.");
    }

    setObjectPosition(name, x, y) {
        this.objects[name].x = x;
        this.objects[name].y = y;
        this.updateGraphics();
    }



    // UTILS
    cellIsWall(x, y) {
        if (x < 0 || y < 0 || x >= this.size.x || y >= this.size.y)
            return true;
        else if (this.wall_map[x][y])
            return true;
        return false
    }

    getCorrespondingCell(grid, event) {
        var x = event.layerX;
        var y = event.layerY;

        // Simple
        var cell_x = Math.ceil(x / (grid.cell_width + grid.spacing_x)) - 1;
        var cell_y = Math.ceil(y / (grid.cell_height + grid.spacing_y)) - 1;

        if (cell_x < 0 || cell_x > this.size.x || cell_y < 0 || cell_y > this.size.y) {
            return null;
        }

        log.debug("Cell " + cell_x + " - " + cell_y);

        return {
            x: cell_x,
            y: cell_y
        }
    }

    relocateStartEnd(cell) {
        if (this.cellIsWall(cell.x, cell.y)) {
            if (grid.positionEndPoint) {
                log.error("Trying to place 'end' point over a wall.")
            } else {
                log.error("Trying to place 'start' point over a wall.")
            }
        } else {
            // Remove all previous paths
            for (var key in this.objects) {
                var obj = this.objects[key];
                if (obj.type == this.LINE) {
                    delete this.objects[obj.name];
                }
            }


            if (grid.positionEndPoint) {
                if (!grid.objects['end'])
                    grid.addCircle("end", grid.MEDIUM_SMALL, cell.x, cell.y, grid.END_COLOR);
                else
                    grid.setObjectPosition("end", cell.x, cell.y);
                grid.positionEndPoint = false;

                grid.drawPath = true;
                this.evaluatePath();
            } else {
                if (!grid.objects['start'])
                    grid.addCircle("start", grid.MEDIUM_SMALL, cell.x, cell.y, grid.START_COLOR);
                else {
                    grid.setObjectPosition("start", cell.x, cell.y);
                    grid.removeObj("end");
                }

                grid.positionEndPoint = true;
            }
        }
    }

    // MOUSE HANDLING
    onMouseMove(grid, event) {
        if (grid.mouseIsDown) {
            var cell;

            if (cell = grid.getCorrespondingCell(grid, event)) {

                if (grid.lastCellMouseOver) {

                    if (grid.lastCellMouseOver.x != cell.x || grid.lastCellMouseOver.y != cell.y) {
                        if (!grid.mouseWasDragged) {
                            grid.mouseWasDragged = true;

                            if (grid.cellIsWall(cell.x, cell.y))
                                grid.mouseDragAction = function (x, y) {
                                    grid.removeWall(x, y, false);
                                };
                            else
                                grid.mouseDragAction = function (x, y) {
                                    grid.addWall(x, y);
                                };
                        }
                        grid.mouseDragAction(cell.x, cell.y);
                    }
                }

                grid.lastCellMouseOver = cell;
            }
        }
    }

    onMouseDown(grid, event) {
        grid.mouseIsDown = true;
        grid.mouseWasDragged = false;
    }

    onMouseUp(grid, event) {
        grid.mouseIsDown = false;
    }

    onMouseClick(grid, event) {
        if (!grid.mouseWasDragged) {
            var cell;

            if (cell = grid.getCorrespondingCell(grid, event)) {
                grid.toggleWall(cell.x, cell.y);
            }
        }

        grid.mouseWasDragged = false;
    }

    onMouseRightClick(grid, event) {
        event.preventDefault();

        if (event.button != 0) { // Right or middle click
            var cell;

            if (cell = grid.getCorrespondingCell(grid, event)) {
                grid.relocateStartEnd(cell);
            }
        }
    }



    // PATH COMPUTATION
    evaluatePath() {
        if (this.drawPath) {

            // Remove all previous paths and points, except for 'start' and 'end' points
            for (var key in this.objects) {
                var obj = this.objects[key];
                if (obj.type == this.LINE || (obj.type == this.CIRCLE && obj.name != 'start' && obj.name != "end")) {
                    delete this.objects[obj.name];
                }

                // Remove text labels (potential field)
                this.removeAllText();
            }

            var pointList;
            var computeTime = performance.now();

            switch (this.algorithm) {

                case "decomposition":
                    pointList = new Decomposition(grid).getPointList();
                    break;
                case "visibility":
                    pointList = new Visibility(grid).visibilityGraph();
                    break;
                case "probabilistic":
                    pointList = new Visibility(grid, this.probabilistic_nodes).probabilisticRoadmap();
                    break;
                case "potential":
                    pointList = new PotentialFields(grid, this.distance_of_influence, this.repulsive_value).simple();
                    break;
                case "potential-memory":
                    pointList = new PotentialFields(grid).withMemory();
                    break;
                case "bug1":
                    pointList = new Bug(grid).bug1();
                    break;
                case "bug2":
                    pointList = new Bug(grid).bug2();
                    break;
                case "tangent-bug":
                    pointList = new Bug(grid).tangentBug();
                    break;
                default:
                    log.error("No algorithm found with name '" + this.algorithm + "'.");
                    this.algorithm = null;
                    break;
            }

            computeTime = performance.now() - computeTime;

            var unit = "ms";

            if (computeTime > 1000) { // seconds
                computeTime /= 1000;
                computeTime = Math.round(computeTime * 100) / 100; // keep 2 decimal digits
                unit = "s";
            } else if (computeTime > 1) { // milliseconds
                computeTime = Math.round(computeTime);
            } else if (computeTime < 1) { // less than 1 millisecond
                computeTime = Math.round(computeTime * 100) / 100; // keep 2 decimal digits
            }

            if (pointList && pointList.length > 0) {
                this.addPath(pointList, "path", grid.SMALL, this.BEST_PATH_COLOR);
                if (pointList[pointList.length - 1].x == this.objects['end'].x && pointList[pointList.length - 1].y == this.objects['end'].y) {
                    this.setPerformance(computeTime, unit, pointList.length);
                    this.setObjectPosition("start", pointList[0].x, pointList[0].y);
                } else {
                    this.setPerformance(computeTime, unit, -1);
                }
            } else {
                this.setPerformance(computeTime, unit, -1);
            }
        }
    }

    setPerformance(time, unit, pathLen) {
        $('#time').html(time + " " + unit);
        $('#length').html(pathLen == -1 ? "No path found" : pathLen + " cells");
    }

    pathCost(path) {
        var last = path[0];
        var cost = 0;
        for (var i = 1; i < path.length; i++) {
            if (Math.abs(last.x - path[i].x) == 1)
                cost += 1
            if (Math.abs(last.y - path[i].y) == 1)
                cost += 1
            last = path[i];
        }
        return cost
    }

    isInPath(path, step) {
        var r = -1;
        for (var i = 0; i < path.length; i++) {
            var el = path[i];
            if (el.x == step.x && el.y == step.y) {
                r = i;
                break;
            }
        }
        return r;
    }

    togglePotentialLabels() {
        this.potential_labels = !this.potential_labels;
        if (this.potential_labels) {
            console.log(this.potential_map);
            // There is no potential map yet
            if (this.potential_map.length == 0) {
                return;
            }

            // Else
            for (var i = 0; i < this.size.x; i++) {
                for (var j = 0; j < this.size.y; j++) {
                    this.addText('pf_' + i + '_' + j, grid.SMALL, i, j, 'white', this.potential_map[i][j]);
                }
            }
        }
        if (!this.potential_labels) {
            this.removeAllText();
        }
    }


    probabilisticNodes() {
        this.probabilistic_nodes = document.getElementById('probabilistic-nodes').value;
    }

    potentialParameters() {
        this.repulsive_value = document.getElementById('repulsive-value').value;
        this.distance_of_influence = document.getElementById('distance-of-influence').value;
    }

    downloadMap() {
        var map_json = {}
        map_json['spacing_x'] = this.spacing_x;
        map_json['spacing_y'] = this.spacing_y;
        map_json['cell_side_length'] = this.cellSideLength;
        map_json['size'] = this.size;
        map_json['wall_map'] = this.wall_map;
        var wall_object = {};
        for (var key in this.objects) {
            var obj = this.objects[key];
            if (obj.type == this.RECT) {
                wall_object[key] = obj;
            }
        }
        map_json['objects'] = wall_object;

        var date = new Date();
        download(JSON.stringify(map_json), "map_" + date.getTime() + ".json", "application/json");
    }


    handleFiles(file) {
        var self = this;
        this.reader.onload = function (event) {
            var read_map_json = JSON.parse(event.target.result)

            // Check size
            if (self.size.x < read_map_json['size'].x || self.size.y < read_map_json['size'].y) {
                var alert_str = 'Map dimensions non compatible:\n';
                alert_str += 'Trying to load (' + read_map_json['size'].x + ', ' + read_map_json['size'].y + ') on a (' + self.size.x + ', ' + self.size.y + ') map.'
                alert(alert_str);
                return;
            }

            self.spacing_x = read_map_json['spacing_x'];
            self.spacing_y = read_map_json['spacing_y'];
            self.cellSideLength = read_map_json['cell_side_length'];
            self.generate();
            self.size = read_map_json['size'];
            self.wall_map = read_map_json['wall_map'];
            self.objects = read_map_json['objects'];
            self.updateGraphics();
        };
        this.reader.readAsText(file[0], 'UTF-8');
    }
}