/**
 * Rotates the map according to a smartphone's compass.
 *
 * @typedef L.Map.CompassBearing
 */

L.Map.CompassBearing = L.Handler.extend({
  initialize: function (map) {
    this._map = map
    /** @see https://caniuse.com/?search=DeviceOrientation */
    if ('ondeviceorientationabsolute' in window) {
      this.__deviceOrientationEvent = 'deviceorientationabsolute'
    } else if ('ondeviceorientation' in window) {
      this.__deviceOrientationEvent = 'deviceorientation'
    }
    this._throttled = L.Util.throttle(this._onDeviceOrientation, 100, this)
  },

  addHooks: function () {
    if (this._map._rotate && this.__deviceOrientationEvent) {
      L.DomEvent.on(window, this.__deviceOrientationEvent, this._throttled, this)
    } else {
      // L.Map.CompassBearing handler will be automatically
      // disabled if device orientation is not supported.
      this.disable()
    }
  },

  removeHooks: function () {
    if (this._map._rotate && this.__deviceOrientationEvent) {
      L.DomEvent.off(window, this.__deviceOrientationEvent, this._throttled, this)
    }
  },

  _lastStablePose: {
    isLandscape: false,
    physicalAngle: 0,
    isLookingUp: false,
  },

  _getDeviceOrientationAdvanced: function (beta, gamma) {
    const degToRad = Math.PI / 180
    const b = beta * degToRad
    const g = gamma * degToRad

    const gX = -Math.sin(g) * Math.cos(b)
    const gY = Math.sin(b)
    const gZ = Math.cos(g) * Math.cos(b)

    const absGX = Math.abs(gX)
    const absGY = Math.abs(gY)

    let isLandscape = this._lastStablePose.isLandscape
    const threshold = 0.2

    if (isLandscape) {
      if (absGY > absGX + threshold) isLandscape = false
    } else {
      if (absGX > absGY + threshold) isLandscape = true
    }

    const state = {
      isLandscape: isLandscape,
      isLookingUp: gZ < 0,
      physicalAngle: 0,
      gZ: gZ,
    }

    if (isLandscape) {
      state.physicalAngle = gX < 0 ? 90 : 270
    } else {
      state.physicalAngle = gY > 0 ? 0 : 180
    }

    this._lastStablePose = {
      isLandscape: state.isLandscape,
      physicalAngle: state.physicalAngle,
      isLookingUp: state.isLookingUp,
    }

    return state
  },

  /**
   * `DeviceOrientationEvent.absolute` - Indicates whether the device is providing absolute
   *                                     orientation values (relatives to Magnetic North) or
   *                                     using some arbitrary frame determined by the device.
   *
   * `DeviceOrientationEvent.alpha`    - Returns the rotation of the device around the Z axis;
   *                                     that is, the number of degrees by which the device is
   *                                     being twisted around the center of the screen.
   *
   * `window.orientation`              - Returns the screen orientation in degrees (in 90-degree increments)
   *                                     of the viewport relative to the device's natural orientation.
   *                                     Its only possible values are -90, 0, 90, and 180. Positive
   *                                     values are counterclockwise; negative values are clockwise.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/absolute
   * @see https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/alpha
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/orientation
   */
  _onDeviceOrientation: function (e) {
    if (!this._enabled) {
      return
    }
    var angle = e.webkitCompassHeading || e.alpha
    var deviceOrientation = 0

    const status = this._getDeviceOrientationAdvanced(e.beta, e.gamma)
    const { isLandscape, isLookingUp, physicalAngle } = status

    if (!e.absolute && e.webkitCompassHeading) {
      // Safari iOS
      angle = 360 - angle
    } else if (isLandscape && isLookingUp) {
      angle = (angle + 180) % 360
    }

    // Older browsers
    if (
      window.screen &&
      window.screen.orientation &&
      window.screen.orientation.angle !== undefined
    ) {
      deviceOrientation = window.screen.orientation.angle
    } else if ('undefined' !== typeof window.orientation) {
      deviceOrientation = window.orientation
    }


    let targetAngle = angle - deviceOrientation

    // Smooth

    // const filterFactor = isLookingUp ? 0.05 : 0.15
    // let diff = targetAngle - this._map.getBearing()
    // if (diff > 180) diff -= 360
    // if (diff < -180) diff += 360

    // targetAngle = (this._map.getBearing() + diff * filterFactor + 360) % 360

    this._map.setBearing(targetAngle)
  },
})

/**
 * Add Compass bearing handler to L.Map (disabled unless `window.DeviceOrientationEvent` is set).
 *
 * @property {L.Map.CompassBearing} compassBearing
 */
L.Map.addInitHook('addHandler', 'compassBearing', L.Map.CompassBearing)
