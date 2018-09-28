// Bug methods
class Bug {

    constructor(grid) {
        this.grid = grid;
        this.dummyPath = this.findDummyPath(this.grid.objects['start'], this.grid.objects['end'])
    }

    findDummyPath(start, end) {
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

            pointList.push({
                x: x,
                y: y
            })
            last.x = x;
            last.y = y;
        }
        return pointList
    }

    tangentBug() {
        log.debug("tangent bug");
        var startTime = performance.now();

        var path = [];
        for (var i = 0; i < this.dummyPath.length; i++) { //try to follow the dummy path
            var cTime = performance.now();
            if (cTime - startTime > 1000)
                return []
            log.debug(this.dummyPath[i])
            var range = this.rangeArea(this.dummyPath[i], 2);
            log.debug('range');
            log.debug(range);
            var free = true;
            var discontinuities = [];
            for (var j = 0; j < range.length; j++) { //check if range area is free
                if (this.grid.cellIsWall(range[j].x, range[j].y) || ((this.grid.cellIsWall(range[j].x + 1, range[j].y) && this.grid.cellIsWall(range[j].x, range[j].y - 1)) || this.grid.cellIsWall(range[j].x + 1, range[j].y) && this.grid.cellIsWall(range[j].x, range[j].y + 1)) || (this.grid.cellIsWall(range[j].x - 1, range[j].y) && this.grid.cellIsWall(range[j].x, range[j].y - 1)) || (this.grid.cellIsWall(range[j].x - 1, range[j].y) && this.grid.cellIsWall(range[j].x, range[j].y + 1))) {
                    discontinuities.push(range[j]); //the list of obstacles in range
                    if (this.grid.isInPath(this.dummyPath, range[j]) != -1) //if there are obstacles in range, but the dummy path is free follow the dummy path
                        free = false;
                }
            }
            if (free) { //if free follow the dummy path
                log.debug(this.dummyPath[i])
                log.debug("free")
                path.push(this.dummyPath[i])
            } else {
                log.debug(this.dummyPath[i])
                log.debug("not free")
                var min;
                var minDist = 100;
                log.debug("-------- ")
                log.debug(discontinuities);
                discontinuities = this.findDiscontinuities(discontinuities);
                log.debug("-------- ")
                log.debug(discontinuities);
                for (var j = 0; j < discontinuities.length; j++) { //find the nearest discontinuity
                    var toDisc = this.findDummyPath(this.dummyPath[i], discontinuities[j]);
                    var dist = this.grid.pathCost(this.findDummyPath(discontinuities[j], grid.objects['end'])) + this.grid.pathCost(toDisc) //the distance is given by the sum of the distances between you and the discontinuity and between the discontinuity and the end
                    for (var z = 0; z < toDisc.length - 1; z++) { // check that the path to the discontinuity is free
                        if (this.grid.cellIsWall(toDisc[z].x, toDisc[z].y) || ((this.grid.cellIsWall(toDisc[z].x + 1, toDisc[z].y) && this.grid.cellIsWall(toDisc[z].x, toDisc[z].y - 1)) || this.grid.cellIsWall(toDisc[z].x + 1, toDisc[z].y) && this.grid.cellIsWall(toDisc[z].x, toDisc[z].y + 1)) || (this.grid.cellIsWall(toDisc[z].x - 1, toDisc[z].y) && this.grid.cellIsWall(toDisc[z].x, toDisc[z].y - 1)) || (this.grid.cellIsWall(toDisc[z].x - 1, toDisc[z].y) && this.grid.cellIsWall(toDisc[z].x, toDisc[z].y + 1)))
                            dist = 100;
                    }
                    if (dist < minDist) {
                        log.debug(discontinuities[j])
                        min = discontinuities[j];
                        minDist = dist;
                    }
                }
                var toDisc = this.findDummyPath(this.dummyPath[i], min);
                if (toDisc.length > 1) {
                    log.debug("toDisc");
                    log.debug(toDisc)
                    path = path.concat(toDisc);
                    path.pop();
                    //now boundary following 
                    //heuristic to understand in which direction is better to turn around the obstacle
                    var dir = "anti";
                    if (Math.abs(this.grid.objects["end"].x - this.grid.objects["start"].x) > Math.abs(this.grid.objects["end"].y - this.grid.objects["start"].y)) { // i'm moving horizontally
                        log.debug("orizzontale")
                        if ((toDisc[0].x < toDisc[1].x && toDisc[0].y > toDisc[1].y) || (toDisc[0].x > toDisc[1].x && toDisc[0].y < toDisc[1].y))
                            dir = "or";
                    } else { // vertically
                        if ((toDisc[0].x > toDisc[1].x && toDisc[0].y > toDisc[1].y) || (toDisc[0].x < toDisc[1].x && toDisc[0].y < toDisc[1].y))
                            dir = "or";
                    }
                    log.debug(dir)
                    this.boundaryFollow(toDisc[toDisc.length - 2], min, this.grid.objects["end"], dir, path, startTime);
                } else {
                    path.push(this.dummyPath[i]);
                    this.boundaryFollow(this.dummyPath[i], this.dummyPath[i + 1], this.grid.objects["end"], "anti", path, startTime);
                }
                this.dummyPath = this.findDummyPath(path[path.length - 1], this.grid.objects["end"]);
                i = 0;
            }
        }
        return path;
    }

    //circumnavigate equivalent for tangent bug
    boundaryFollow(last, obstacle, end, dir, path, startTime) {
        var cTime = performance.now();
        if (cTime - startTime > 1000)
            return []

        var newStep = this.followObs(last, obstacle, dir);
        if (!this.grid.cellIsWall(newStep.x, newStep.y)) {
            path.push(newStep);
            if (newStep.x == this.grid.objects["end"].x && newStep.y == this.grid.objects["end"].y)
                return path;
            var dummy = this.findDummyPath(newStep, end);
            var range = this.rangeArea(newStep, 1);
            var free = true;
            var dFollowed = this.grid.pathCost(this.findDummyPath(obstacle, end))
            var dReach = this.grid.pathCost(this.findDummyPath(newStep, end))
            for (var j = 0; j < range.length; j++) { //check if range area is free
                if (this.grid.cellIsWall(range[j].x, range[j].y) || ((this.grid.cellIsWall(range[j].x + 1, range[j].y) && this.grid.cellIsWall(range[j].x, range[j].y - 1)) || this.grid.cellIsWall(range[j].x + 1, range[j].y) && this.grid.cellIsWall(range[j].x, range[j].y + 1)) || (this.grid.cellIsWall(range[j].x - 1, range[j].y) && this.grid.cellIsWall(range[j].x, range[j].y - 1)) || (this.grid.cellIsWall(range[j].x - 1, range[j].y) && this.grid.cellIsWall(range[j].x, range[j].y + 1))) {
                    if (this.grid.isInPath(dummy, range[j]) != -1) { //if there are obstacles in range, but the dummy path is free follow the dummy path
                        log.debug("not free in folow")
                        free = false;
                        break;
                    }
                }
            }
            if (free && dReach <= dFollowed) {
                return path
            }
            return this.boundaryFollow(newStep, obstacle, end, dir, path, startTime);
        } else
            log.debug(newStep)
        return this.boundaryFollow(last, newStep, end, dir, path, startTime);
    }

    findDiscontinuities(obs) {
        var disc = []; //discontinuities
        var paths = []; //path do destination, used to understand if the discontinuity if behind another one
        var counts = []; //count of near onjects used to undertand if the obsacle is a discontinuity
        for (var i = 0; i < obs.length; i++) {
            var count = 0;
            var nears = []
            nears.push({
                x: obs[i].x + 1,
                y: obs[i].y
            })
            nears.push({
                x: obs[i].x - 1,
                y: obs[i].y
            })
            nears.push({
                x: obs[i].x,
                y: obs[i].y + 1
            })
            nears.push({
                x: obs[i].x,
                y: obs[i].y - 1
            })
            for (var j = 0; j < nears.length; j++) {
                if (this.grid.isInPath(obs, nears[j]) != -1)
                    count += 1
                if (count > 3)
                    break
            }
            if (count <= 3) {
                disc.push(obs[i]);
                counts.push(count);
                paths.push(this.findDummyPath(obs[i], this.grid.objects["end"]));
            }
        }
        var min = Math.min(...counts);
        log.debug("min " + min);
        log.debug(disc);
        var res = [];
        for (var i = 0; i <= disc.length; i++) {
            if (counts[i] <= min || counts[i] < 2) {
                var first = true;
                for (var j = 0; j < disc.length; j++) { //check that the discontinuity does not appear in the path from another one to the destination
                    if (i != j) {
                        if (this.grid.isInPath(paths[j], disc[i]) != -1) {
                            first = false;
                            break;
                        }
                    }
                }
                if (first)
                    res.push(disc[i]);
            }
        }
        if (res.length > 0)
            return res
        return (disc)
    }

    rangeArea(o, r) { //o is a point object, and r is the radio of the circonference ( in our case it will be a square, according to our distance definition, as the number of steps)
        var range = [];
        for (var i = 0; i < this.grid.size.x; i++) {
            for (var j = 0; j < this.grid.size.y; j++) {
                if (o.x - r <= i && i <= o.x + r && o.y - r <= j && j <= o.y + r) {
                    range.push({
                        x: i,
                        y: j
                    })
                }
            }
        }
        return range
    }


    followObs(lastStep, obstacle, sense = "anti") {
        log.debug("last ")
        log.debug(lastStep);
        log.debug("obs ")
        log.debug(obstacle);
        var dir = "";
        if (lastStep.y > obstacle.y)
            dir += "N";
        else if (lastStep.y < obstacle.y)
            dir += "S";
        if (lastStep.x > obstacle.x)
            dir += "O";
        else if (lastStep.x < obstacle.x)
            dir += "E";

        var newStep;
        log.debug(dir)

        log.debug(sense)
        if (sense == "anti") {
            if (dir == "E" || dir == "SE") {
                newStep = {
                    x: lastStep.x,
                    y: lastStep.y + 1
                }
            } else if (dir == "NE" || dir == "N") {
                newStep = {
                    x: lastStep.x + 1,
                    y: lastStep.y
                }
            } else if (dir == "NO" || dir == "O") {
                newStep = {
                    x: lastStep.x,
                    y: lastStep.y - 1
                }
            } else if (dir == "SO" || dir == "S") {
                newStep = {
                    x: lastStep.x - 1,
                    y: lastStep.y
                }
            }
        } else {
            if (dir == "O" || dir == "SO") {
                newStep = {
                    x: lastStep.x,
                    y: lastStep.y + 1
                }
            } else if (dir == "SE" || dir == "S") {
                newStep = {
                    x: lastStep.x + 1,
                    y: lastStep.y
                }
            } else if (dir == "NE" || dir == "E") {
                newStep = {
                    x: lastStep.x,
                    y: lastStep.y - 1
                }
            } else if (dir == "NO" || dir == "N") {
                newStep = {
                    x: lastStep.x - 1,
                    y: lastStep.y
                }
            }
        }
        return newStep;
    }

    bug1() {
        var path = [];
        for (var i = 0; i < this.dummyPath.length; i++) {
            var step = this.dummyPath[i];
            if (!this.grid.cellIsWall(step.x, step.y)) {
                log.debug(step)
                path.push(step);
            } else {
                log.debug("wall")
                path.push(step);
                var lastStep = this.dummyPath[this.grid.isInPath(this.dummyPath, step) - 1];
                var res = {
                    circumnavigation: [],
                    dists: []
                };

                var dummy = this.findDummyPath(lastStep, this.grid.objects['end']);
                var dist = this.grid.pathCost(dummy);
                res.circumnavigation.push(lastStep);
                res.dists.push(dist)

                res = this.circumnavigate1(lastStep, step, this.grid.objects['end'], res)
                //usa res per capire il minimo e percorrere il percorso all'indietro
                log.debug(path.length);
                path.pop();
                path.pop();
                log.debug(path.length);

                var minDist = Math.min(...res.dists);
                log.debug("min dist: " + minDist)
                var nearest = res.circumnavigation[res.dists.lastIndexOf(minDist)];
                log.debug(nearest);
                var backToNearest = res.circumnavigation.slice(res.dists.lastIndexOf(minDist), res.dists.length)

                backToNearest.reverse();
                log.debug(backToNearest);
                path = path.concat(res.circumnavigation);
                path = path.concat(backToNearest.slice(1, backToNearest.length));


                this.dummyPath = this.findDummyPath(nearest, this.grid.objects['end']);
                log.debug("raggirato");
                i = 0;
                log.debug("--- " + i);
            }
        }
        log.debug(path);
        return path
    }

    circumnavigate1(lastStep, obstacle, end, obj) { //end è la destinazione finale, mi serve per la distanza, dists contiene le distanze lungo la circumnavigazione
        var newStep = this.followObs(lastStep, obstacle);
        var dummy = this.findDummyPath(newStep, end);
        var dist = this.grid.pathCost(dummy);
        obj.circumnavigation.push(newStep);
        obj.dists.push(dist)
        if (newStep.x == this.grid.objects["end"].x && newStep.y == this.grid.objects["end"].y)
            return obj;
        log.debug("new ");
        log.debug(newStep);
        if (!this.grid.cellIsWall(newStep.x, newStep.y)) {
            if (newStep.x == obj.circumnavigation[0].x && newStep.y == obj.circumnavigation[0].y) { // se hai completato il giro
                log.debug(obj.dists)
                return obj
            }
            return this.circumnavigate1(newStep, obstacle, end, obj);
        }
        obj.circumnavigation.pop();
        obj.dists.pop();
        log.debug(newStep)
        return this.circumnavigate1(lastStep, newStep, end, obj)
    }

    bug2() {
        var path = [];
        var startTime = performance.now();
        for (var i = 0; i < this.dummyPath.length; i++) {
            var cTime = performance.now();
            if (cTime - startTime > 1000)
                return []
            var step = this.dummyPath[i];
            if (!this.grid.cellIsWall(step.x, step.y)) {
                log.debug(step)
                path.push(step);
            } else {
                log.debug("wall")
                path.push(step);
                var lastStep = this.dummyPath[this.grid.isInPath(this.dummyPath, step) - 1];
                path = this.circumnavigate2(lastStep, step, path, this.dummyPath, startTime)
                if (path.length == 0)
                    return path
                log.debug("raggirato")
                var last = path[path.length - 1]
                i = this.grid.isInPath(this.dummyPath, last) - 1; // il nuovo punto è sul dummy path, quindi basta ripartire da quell'indice
                log.debug("--- " + i);
            }
        }
        return path
    }

    circumnavigate2(lastStep, obstacle, newPath, oldPath, startTime) {
        var cTime = performance.now();
        if (cTime - startTime > 1000) {
            log.debug("TOOO MUCH TIME")
            return [];
        }
        var newStep = this.followObs(lastStep, obstacle);
        var newPath = newPath.slice(0, this.grid.isInPath(newPath, lastStep) + 1)
        newPath.push(newStep)
        log.debug(newStep)
        if (!this.grid.cellIsWall(newStep.x, newStep.y)) {
            if (this.grid.isInPath(oldPath, newStep) != -1 && this.grid.isInPath(newPath, newStep) == newPath.length - 1)
                return newPath
            return this.circumnavigate2(newStep, obstacle, newPath, oldPath, startTime);
        } else
            return this.circumnavigate2(lastStep, newStep, newPath, oldPath, startTime)
    }
}