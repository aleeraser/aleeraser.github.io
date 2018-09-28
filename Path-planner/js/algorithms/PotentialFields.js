// Potential Fields methods
class PotentialFields {

    constructor(grid, distance_of_influence, repulsive_value) {
        this.grid = grid;
        this.show_labels = grid.potential_labels;
        this.distance_of_influence = distance_of_influence;
        this.repulsive_value = repulsive_value;
    }

    simple() {
        return this.compute();
    }

    withMemory() {
        return this.compute(true);
    }

    compute(memory = false) {

        this.grid.removeAllText();

        var goal = this.grid.objects['end'];


        this.grid.repulsive_map = [];
        for (var i = 0; i < this.grid.size.x; i++) {
            var l = []
            for (var j = 0; j < this.grid.size.y; j++) {
                l.push(0);
            }
            this.grid.repulsive_map.push(l);
        }

        // Range of influence
        var influence = [];
        for (var i = -this.distance_of_influence; i <= this.distance_of_influence; i++) {
            influence.push(i);
        }

        for (var i = 0; i < this.grid.size.x; i++) {
            for (var j = 0; j < this.grid.size.y; j++) {
                if (this.grid.wall_map[i][j] == 1) {
                    this.grid.repulsive_map[i][j] = this.repulsive_value;
                    influence.forEach(x => {
                        influence.forEach(y => {
                            var repulsion = this.repulsive_value / (Math.abs(x) + Math.abs(y));
                            if (i + x > 0 && i + x < this.grid.size.x && j + y > 0 && j + y < this.grid.size.y) {
                                if (this.grid.repulsive_map[i + x][j + y] < repulsion) {
                                    this.grid.repulsive_map[i + x][j + y] = repulsion;
                                }
                            }
                        })
                    })
                }
            }
        }
        log.debug("Repulsive map:");
        log.debug(this.grid.repulsive_map);


        // Potential matrix
        this.grid.potential_map = [];
        var pf = null;
        for (var i = 0; i < this.grid.size.x; i++) {
            var l = []
            for (var j = 0; j < this.grid.size.y; j++) {
                // Goal has minimum potential value
                if (i == goal.x && j == goal.y)
                    pf = 0;
                else 
                    pf = Math.pow(i - goal.x, 2) + Math.pow(j - goal.y, 2) + this.grid.repulsive_map[i][j];
                l.push(pf);

                if (this.show_labels)
                    this.grid.addText('pf_' + i + '_' + j, grid.SMALL, i, j, 'white', pf);
            }
            this.grid.potential_map.push(l);
        }
        log.debug("Potential map:");
        log.debug(this.grid.potential_map);


        // Follow potential from start position
        var position = {
            x: this.grid.objects['start'].x,
            y: this.grid.objects['start'].y
        };

        var path = [position];

        while (position.x != goal.x || position.y != goal.y) {
            position = this.performPotentialStep(position, path, memory);
            log.debug(position);
            if (position.x == null || position.y == null) {
                console.error('Local minimum');
                break;
            }
            if (this.grid.isInPath(path, position) > -1 && !memory) {
                console.error('Loop');
                break;
            }
            path.push(position);
        }

        log.debug("Done");
        log.debug(path);
        return path;
    }

    performPotentialStep(position, path, memory) {
        var x_index, y_index;
        var x = [position.x + 1, position.x, position.x - 1];
        var y = [position.y - 1, position.y, position.y + 1];

        var best_potential;
        if (!memory) best_potential = this.grid.potential_map[position.x][position.y];
        else best_potential = Number.POSITIVE_INFINITY;

        var move = {
            x: null,
            y: null
        };

        for (x_index = 0; x_index < x.length; x_index++) {
            for (y_index = 0; y_index < y.length; y_index++) {
                // Exclude the point itself
                if (position.x != x[x_index] || position.y != y[y_index]) {
                    if (x[x_index] > 0 && x[x_index] < this.grid.size.x && y[y_index] > 0 && y[y_index] < this.grid.size.y) {

                        if (this.grid.wall_map[x[x_index]][y[y_index]] != 1) {
                            if (this.grid.potential_map[x[x_index]][y[y_index]] < best_potential && this.grid.isInPath(path, {
                                    x: x[x_index],
                                    y: y[y_index]
                                }) == -1) {
                                var aux = {};
                                aux.x = x[x_index];
                                aux.y = y[y_index];

                                // Avoid diagonal between obstacles
                                if (aux.x == position.x + 1 && aux.y == position.y + 1 && this.grid.cellIsWall(position.x + 1, position.y) && this.grid.cellIsWall(position.x, position.y + 1)) continue;
                                if (aux.x == position.x - 1 && aux.y == position.y - 1 && this.grid.cellIsWall(position.x - 1, position.y) && this.grid.cellIsWall(position.x, position.y - 1)) continue;
                                if (aux.x == position.x + 1 && aux.y == position.y - 1 && this.grid.cellIsWall(position.x + 1, position.y) && this.grid.cellIsWall(position.x, position.y - 1)) continue;
                                if (aux.x == position.x - 1 && aux.y == position.y + 1 && this.grid.cellIsWall(position.x - 1, position.y) && this.grid.cellIsWall(position.x, position.y + 1)) continue;

                                best_potential = this.grid.potential_map[x[x_index]][y[y_index]];
                                move.x = aux.x;
                                move.y = aux.y;
                            }
                        }
                    }
                }
            }
        }

        return move;
    }

}