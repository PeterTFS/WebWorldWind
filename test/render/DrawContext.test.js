/*
 * Copyright 2015-2017 WorldWind Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
    'src/BasicWorldWindowController',
    'src/render/DrawContext',
    'src/globe/EarthElevationModel',
    'src/globe/Globe',
    'src/geom/Matrix',
    'src/navigate/LookAtNavigator',
    'src/geom/Plane',
    'src/geom/Rectangle',
    'src/geom/Vec2',
    'src/geom/Vec3',
    'src/WorldWind',
    'src/WorldWindow'
], function (BasicWorldWindowController, DrawContext, EarthElevationModel, Globe, Matrix, LookAtNavigator, Plane, Rectangle, Vec2, Vec3, WorldWind, WorldWindow) {
    "use strict";

    var expectMatrixCloseTo = function (matrix1, matrix2) {
        for (var i = 0; i < 16; i++) {
            expect(matrix1[i]).toBeCloseTo(matrix2[i], 3);
        }
    };

    var expectVec3CloseTo = function (v1, v2) {
        for (var i = 0; i < 3; i++) {
            expect(v1[i]).toBeCloseTo(v2[i], 3);
        }
    };

    var expectPlaneCloseTo = function (p1, p2) {
        expect(p1.distance).toBeCloseTo(p2.distance, 3);
        expectVec3CloseTo(p1.normal, p2.normal);
    };

    var MockGlContext=function() {
        this.drawingBufferWidth=800;
        this.drawingBufferHeight=800;
    };

    var viewport = new Rectangle(0, 0, 848, 848);
    var dummyParam = "dummy";
    var dc = new DrawContext(new MockGlContext());
    var MockWorldWindow = function () {
    };

    MockWorldWindow.prototype = Object.create(WorldWindow.prototype);

    // create a globe that returns mock elevations for a given sector so we don't have to rely on
    // asynchronous tile calls to finish.
    Globe.prototype.minAndMaxElevationsForSector = function (sector) {
        return [125.0, 350.0];
    };
    var mockGlobe = new Globe(new EarthElevationModel());
    var wwd = new MockWorldWindow();
    wwd.globe = mockGlobe;
    wwd.drawContext = dc;
    wwd.navigator = new LookAtNavigator();
    wwd.worldWindowController = new BasicWorldWindowController(wwd);
    wwd.viewport = viewport;
    wwd.resetDrawContext();

    describe("DrawContext Tests", function () {

        describe("Calculates correct view transforms", function () {
            it("Computes the correct transform", function () {
                var expectedModelview = new Matrix(
                    -0.342, 0, 0.939, 2.328e-10,
                    0.469, 0.866, 0.171, 18504.137,
                    -0.813, 0.500, -0.296, -16372797.555,
                    0, 0, 0, 1
                );
                expectMatrixCloseTo(dc.modelview, expectedModelview);

                var expectedProjection = new Matrix(
                    2, 0, 0, 0,
                    0, 2, 0, 0,
                    0, 0, -1.196, -3254427.538,
                    0, 0, -1, 0
                );
                expectMatrixCloseTo(dc.projection, expectedProjection);

                var expectedMvp = new Matrix(
                    -0.684, 0, 1.878, 4.656e-10,
                    0.938, 1.732, 0.342, 37008.274,
                    0.972, -0.598, 0.354, 16327438.338,
                    0.813, -0.5, 0.296, 16372797.555);
                expectMatrixCloseTo(dc.modelviewProjection, expectedMvp);

                var expectedEyePoint = new Vec3(-13319762.852, 8170374.195, -4849512.284);
                expectVec3CloseTo(dc.eyePoint, expectedEyePoint);

                var expectedMvn = new Matrix(
                    -0.342, 0, 0.939, 0,
                    0.469, 0.866, 0.171, 0,
                    -0.813, 0.5, -0.296, 0,
                    0, 0, 0, 1);
                expectMatrixCloseTo(dc.modelviewNormalTransform, expectedMvn);

                expect(dc.pixelSizeScale).toBeCloseTo(0.00118, 5);
                expect(dc.pixelSizeOffset).toBeCloseTo(0, 5);

                var expectedBottom = new Plane(0.784, 0.551, 0.286, 7345398.414);
                expectPlaneCloseTo(dc.frustumInModelCoordinates._bottom, expectedBottom);

                var expectedFar = new Plane(-0.814, 0.5, -0.296, 231588.485);
                expectPlaneCloseTo(dc.frustumInModelCoordinates._far, expectedFar);

                var expectedLeft = new Plane(0.058, -0.224, 0.973, 7327329.45);
                expectPlaneCloseTo(dc.frustumInModelCoordinates._left, expectedLeft);

                var expectedNear = new Plane(0.814, -0.5, 0.296, 14901364.249);
                expectPlaneCloseTo(dc.frustumInModelCoordinates._near, expectedNear);

                var expectedRight = new Plane(0.67, -0.224, -0.708, 7326730.765);
                expectPlaneCloseTo(dc.frustumInModelCoordinates._right, expectedRight);

                var expectedTop = new Plane(-0.056, -0.998, -0.021, 7305904.873);
                expectPlaneCloseTo(dc.frustumInModelCoordinates._top, expectedTop);
            });
        });

        describe("Calculates correct projections", function () {
            it("Should throw an exception on missing input parameter", function () {
                expect(function () {
                    dc.project(null, dummyParam);
                }).toThrow();
            });

            it("Should throw an exception on missing output variable", function () {
                expect(function () {
                    dc.project(dummyParam, null);
                }).toThrow();
            });

            it("Computes the correct projection", function () {
                var modelPoint = new Vec3(-1405324.651, 5668987.866, -2535930.346);
                var result = new Vec3(0, 0, 0);
                var expectedResult = new Vec3(285.597, 703.273, 0.958);
                dc.project(modelPoint, result);
                for (var i = 0; i < 3; i++) {
                    expect(result[i]).toBeCloseTo(expectedResult[i], 3);
                }

            });

            it("Should throw an exception on missing input parameter", function () {
                expect(function () {
                    dc.projectWithDepth(null, dummyParam, dummyParam);
                }).toThrow();
            });

            it("Should throw an exception on missing output variable", function () {
                expect(function () {
                    dc.projectWithDepth(dummyParam, dummyParam, null);
                }).toThrow();
            });

            it("Computes the correct projection with depth", function () {
                var modelPoint = new Vec3(-1405324.651, 5668987.866, -2535930.346);
                var result = new Vec3(0, 0, 0);
                var expectedResult = new Vec3(285.597, 703.273, 0.956);
                var depthOffset = -0.003;
                dc.projectWithDepth(modelPoint, depthOffset, result);
                for (var i = 0; i < 3; i++) {
                    expect(result[i]).toBeCloseTo(expectedResult[i], 3);
                }

            });
        });

        describe("Calculates correct WebGL screen coordinates", function () {
            it("Should throw an exception on missing input parameter", function () {
                expect(function () {
                    dc.convertPointToViewport(null, dummyParam);
                }).toThrow();
            });

            it("Should throw an exception on missing output variable", function () {
                expect(function () {
                    dc.convertPointToViewport(dummyParam, null);
                }).toThrow();
            });

            it("Correctly converts a window coordinate to WebGL screen coordinate", function () {
                var windowPoint = new Vec2(2.5, 69);
                var result = new Vec2(0, 0);
                var expectedResult = new Vec2(2.5, 779);
                dc.convertPointToViewport(windowPoint, result);
                for (var i = 0; i < 2; i++) {
                    expect(result[i]).toBeCloseTo(expectedResult[i], 2);
                }

            });
        });

        describe("Correctly computes a ray originating at the navigator's eyePoint and extending through the specified point in window coordinates", function () {
            it("Should throw an exception on missing input parameter", function () {
                expect(function () {
                    dc.rayThroughScreenPoint(null);
                }).toThrow();
            });

            it("Calculates rayThroughScreenPoint correctly", function () {
                var screenPoint = new Vec2(13.5, 635);
                var expectedOrigin = new Vec3(-13319762.852, 8170374.195, -4849512.284);
                var expectedDirection = new Vec3(0.758, -0.628, -0.177);
                var line = dc.rayThroughScreenPoint(screenPoint);
                var result = line.origin;
                for (var i = 0; i < 3; i++) {
                    expect(result[i]).toBeCloseTo(expectedOrigin[i], 3);
                }
                result = line.direction;
                for (i = 0; i < 3; i++) {
                    expect(result[i]).toBeCloseTo(expectedDirection[i], 3);
                }
            });
        });

        describe("Correctly computes the approximate size of a pixel at a specified distance from the navigator's eye point", function () {
            it("Calculates pixelSizeAtDistance correctly", function () {
                var distance = 10097319.189;
                var expectedSize = 11907.216;
                var pixelSize = dc.pixelSizeAtDistance(distance);
                expect(pixelSize).toBeCloseTo(expectedSize, 3);
            });
        });
    });
});