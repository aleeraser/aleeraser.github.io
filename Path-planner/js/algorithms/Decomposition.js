// Grid/cellular decomposition methods
class Decomposition {

    constructor(grid) {
        this.gridDecomposition(grid);

        var start_key = grid.objects['start'].x + "_" + grid.objects['start'].y;
        var end_key = grid.objects['end'].x + "_" + grid.objects['end'].y;

        var shortest = grid.adjacency_graph.findShortestPath(start_key, end_key);
        log.debug(shortest);

        // Null means no path available
        if (shortest == null) {
            log.error("No path found.");
            grid.clearPaths(true);
            return;
        }

        var pointList = [];

        shortest.forEach(node => {
            pointList.push({
                x: parseInt(node.split("_")[0]),
                y: parseInt(node.split("_")[1])
            });
        })

        this.pointList = pointList;
    }

    gridDecomposition(grid) {
        var adjacency_matrix = {};

        // iterate over all cells
        for (var i = 0; i < grid.grid_matrix.length; i++) { // x
            for (var j = 0; j < grid.grid_matrix[i].length; j++) { // y
                log.debug("Computing for cell (" + i + ", " + j + ").");

                // skip wall cells
                if (!grid.cellIsWall(i, j)) {
                    var source = i + "_" + j;
                    adjacency_matrix[source] = {};

                    // iterate over adjacent cells
                    for (var k = i - 1; k <= i + 1; k++) {
                        for (var l = j - 1; l <= j + 1; l++) {
                            log.debug("\tChecking (" + k + ", " + l + ")...");

                            // check that target is inside the map
                            if (k >= 0 && k < grid.size.x && l >= 0 && l < grid.size.y) {
                                // exclude the cell itself
                                if (!(k == i && l == j)) {
                                    // check that target has not a wall over it
                                    if (!grid.cellIsWall(k, l)) {
                                        // var target = "c_" + k + "_" + l;
                                        var target = k + "_" + l;

                                        // old method to add cell to adjacency graph, allows a diagonal
                                        // movement between two diagonally adjacent walls
                                        // adjacency_matrix[source][target] = k == i || l == j ? 1 : 2;

                                        if (k == i || l == j) { // non-diagonal cells
                                            log.debug("\t\t\tAdding cell (" + k + ", " + l + ") to adjacency graph.");
                                            adjacency_matrix[source][target] = 1;
                                        } else { // diagonal cells
                                            // exclude diagonal movements if passing between two walls
                                            if (k < i) {
                                                if (l < j) {
                                                    if (!(grid.cellIsWall(k + 1, l) || grid.cellIsWall(k, l + 1))) {
                                                        log.debug("\t\t\tAdding cell (" + k + ", " + l + ") to adjacency graph.");
                                                        adjacency_matrix[source][target] = 2;
                                                    }
                                                } else {
                                                    if (!(grid.cellIsWall(k + 1, l) || grid.cellIsWall(k, l - 1))) {
                                                        log.debug("\t\t\tAdding cell (" + k + ", " + l + ") to adjacency graph.");
                                                        adjacency_matrix[source][target] = 2;
                                                    }
                                                }
                                            } else {
                                                if (l < j) {
                                                    if (!(grid.cellIsWall(k - 1, l) || grid.cellIsWall(k, l + 1))) {
                                                        log.debug("\t\t\tAdding cell (" + k + ", " + l + ") to adjacency graph.");
                                                        adjacency_matrix[source][target] = 2;
                                                    }
                                                } else {
                                                    if (!(grid.cellIsWall(k - 1, l) || grid.cellIsWall(k, l - 1))) {
                                                        log.debug("\t\t\tAdding cell (" + k + ", " + l + ") to adjacency graph.");
                                                        adjacency_matrix[source][target] = 2;
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        log.debug("\t\t\tCell (" + k + ", " + l + ") has a wall.");
                                    }
                                } else {
                                    log.debug("\t\tCell (" + k + ", " + l + ") is the cell itself (" + i + ", " + j + "). Skipping...");
                                }
                            } else {
                                log.debug("\t\tCell (" + k + ", " + l + ") is outside map.");
                            }
                        }
                    }
                } else {
                    log.debug("\tWall in (" + i + ", " + j + ").");
                }
                log.debug("\n\n");
            }
        }

        log.debug(adjacency_matrix);

        grid.adjacency_graph = new Graph(adjacency_matrix);
    }

    getPointList() {
        return this.pointList;
    }

}