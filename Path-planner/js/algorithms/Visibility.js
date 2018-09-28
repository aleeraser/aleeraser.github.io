// Visibility Graph Methods
class Visibility {

    constructor(grid, nodes_num = 10) {
        this.grid = grid;
        this.nodes_num = nodes_num;
    }

    visibilityGraph() {
        return this.compute();
    }

    probabilisticRoadmap() {
        return this.compute(true);
    }

    compute(probabilistic = false) {
        log.debug("Visibility Graph Method");

        // Variables setup
        this.grid.obstacle_vertex_names = [];

        // Obstacle map, initialized to 0 in every cell
        this.grid.obstacle_vertex_map = [];
        for (var i = 0; i < this.grid.size.x; i++) {
            var l = []
            for (var j = 0; j < this.grid.size.y; j++) {
                l.push(0);
            }
            this.grid.obstacle_vertex_map.push(l);
        }

        if (probabilistic) {
            // Random fills obstacle_vertex_map -- Probabilsitic Roadmap
            this.randomObstacleVertex();
        } else {
            // Fills the obstacle_vertex_map -- Visibility Graph
            this.addAllObstaclesVertex();
        }

        // All obstacle vertex plus the start and end position
        var point_names = this.grid.obstacle_vertex_names.concat("start").concat("end");

        var i, j;
        var single_paths = [];
        // Also create a dictionary using its name
        var sp_dict = {};

        // For each pair of points calculate the shortest path
        for (i = 0; i < point_names.length; i++) {
            for (j = i + 1; j < point_names.length; j++) {

                var p = this.findDummyPathIfFree(grid.objects[point_names[i]], grid.objects[point_names[j]]);

                // Dummy path was through a wall; ignore it
                if (p == null) {
                    continue;
                }

                // Start & End are the names of the vertices but the path can actually be used in both directions
                var sp = {
                    name: 'singlepath-' + point_names[i] + '-' + point_names[j],
                    path: p,
                    start: point_names[i],
                    end: point_names[j]
                }

                single_paths.push(sp);
                this.grid.addPath(sp.path, sp.name);
                sp_dict[sp.name] = sp;
            }
        }

        // Now translate single paths to a graph form
        // Each single path is an edge
        var map = {}

        single_paths.forEach(sp => {

            // First time, initialize node in graph
            if (map[sp.start] == null) {
                map[sp.start] = {}
            }
            if (map[sp.end] == null) {
                map[sp.end] = {}
            }

            // Add bidirectional edge, weighted by the lenght of the path
            var cost = this.grid.pathCost(sp.path);
            map[sp.start][sp.end] = cost;
            map[sp.end][sp.start] = cost;
        })

        // Shortest is a list of obstacle_vertex names
        var graph = new Graph(map);
        var shortest = graph.findShortestPath("start", "end");
        log.debug(shortest);

        // Null means no path available
        if (shortest == null) {
            log.error("No path found.");
            return;
        }

        // In sp_dict the singlepath name is used as key
        var i;
        var shortest_path_point_list = []

        // Insert start
        shortest_path_point_list.push({
            x: grid.objects['start'].x,
            y: grid.objects['start'].y
        });

        for (i = 1; i < shortest.length; i++) {
            // Nella creazione del nome non so quale punto è stato messo prima... Li provo entrambi.
            // Se lo uso al contrario i punti del path vanno usati in ordine contrario (reverse)
            var sp_name_v1 = 'singlepath-' + shortest[i - 1] + '-' + shortest[i];
            var sp_name_v2 = 'singlepath-' + shortest[i] + '-' + shortest[i - 1];
            var point_list;
            if (sp_dict[sp_name_v1])
                point_list = sp_dict[sp_name_v1].path;
            else
                point_list = sp_dict[sp_name_v2].path.reverse();

            point_list.slice(1).forEach(point => {
                shortest_path_point_list.push(point);
            })
            log.debug(point_list);
        }

        log.debug(shortest_path_point_list);
        return shortest_path_point_list;
    }

    findDummyPathIfFree(start, end) {
        var pointList = [];
        pointList.push({
            x: start.x,
            y: start.y
        })
        var last = {
            x: start.x,
            y: start.y
        };
        var x, y;
        while (last.x != end.x || last.y != end.y) {
            if (last.x < end.x)
                x = last.x + 1
            else if (last.x == end.x)
                x = last.x
            else x = last.x - 1

            if (last.y < end.y)
                y = last.y + 1
            else if (last.y == end.y)
                y = last.y
            else y = last.y - 1

            // Check if not a wall cell
            if (this.grid.wall_map[x][y] == 1)
                return null;

            // Avoid diagonal between obstacles
            if (x == last.x + 1 && y == last.y + 1 && this.grid.cellIsWall(last.x + 1, last.y) && this.grid.cellIsWall(last.x, last.y + 1)) return null;
            if (x == last.x - 1 && y == last.y - 1 && this.grid.cellIsWall(last.x - 1, last.y) && this.grid.cellIsWall(last.x, last.y - 1)) return null;
            if (x == last.x + 1 && y == last.y - 1 && this.grid.cellIsWall(last.x + 1, last.y) && this.grid.cellIsWall(last.x, last.y - 1)) return null;
            if (x == last.x - 1 && y == last.y + 1 && this.grid.cellIsWall(last.x - 1, last.y) && this.grid.cellIsWall(last.x, last.y + 1)) return null;

            pointList.push({
                x: x,
                y: y
            })
            last.x = x;
            last.y = y;
        }
        return pointList
    }

    addAllObstaclesVertex() {
        // Add obstacles edges
        var i = 0,
            j = 0;
        for (i = 0; i < this.grid.wall_map.length; i++) {
            var row = this.grid.wall_map[i];
            for (j = 0; j < row.length; j++) {
                if (row[j] == 1) {
                    this.addObstacleVertex(i, j);
                }
            }
        }
    }

    // Check the four diagonal point of the specified cell, and adds edges if not occupied
    addObstacleVertex(x, y) {
        var diagonalPositions = [
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1]
        ];

        diagonalPositions.forEach(element => {

            if (x + element[0] >= this.grid.size.x || x + element[0] < 0 || y + element[1] >= this.grid.size.y || y + element[1] < 0) {
                // Outside the map
                return;
            } else if (!this.grid.cellIsWall(x + element[0], y) && !this.grid.cellIsWall(x, y + element[1]) && !this.grid.cellIsWall(x + element[0], y + element[1])) {
                if (this.grid.obstacle_vertex_map[x + element[0]][y + element[1]] == 0) {
                    var obstacle_vertex_name = 'ov' + '_' + (x + element[0]) + '_' + (y + element[1]);
                    this.grid.addCircle(obstacle_vertex_name, grid.MEDIUM, x + element[0], y + element[1], grid.OBSTACLE_EDGE_COLOR);
                    this.grid.obstacle_vertex_names.push(obstacle_vertex_name);
                    this.grid.obstacle_vertex_map[x + element[0]][y + element[1]] = 1;
                }
            }
        });
    }

    randomObstacleVertex() {
        //var SAMPLE_NUM = this.grid.size.x / 2;
        var SAMPLE_NUM = this.nodes_num;
        var MAX_TRIES = this.grid.size.x * 3;
        var i = 0;
        var n = 0;
        var x, y;

        while (i < SAMPLE_NUM && n < MAX_TRIES) {
            x = Math.floor(Math.random() * this.grid.size.x);
            y = Math.floor(Math.random() * this.grid.size.y);

            if (!this.grid.cellIsWall(x, y) && this.grid.obstacle_vertex_map[x][y] == 0) {
                this.grid.obstacle_vertex_map[x][y] = 1;
                var obstacle_vertex_name = "random_" + x + "_" + y;
                this.grid.addCircle(obstacle_vertex_name, grid.MEDIUM, x, y, grid.OBSTACLE_EDGE_COLOR);
                this.grid.obstacle_vertex_names.push(obstacle_vertex_name);
                i++;
            }

            n++;
        }
    }

    logObjectNames() {
        for (var key in this.grid.objects) {
            log.debug(key);
        }
    }
}