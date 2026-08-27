import XCTest

final class RunnerUITests: XCTestCase {

    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launch()
    }

    func testStartRide() throws {

        // Wait for Flutter app to load
        sleep(5)

        // Your Start Ride button
        let startRideButton = app.buttons["START RIDE"]

        XCTAssertTrue(
            startRideButton.waitForExistence(timeout: 10),
            "START RIDE button was not found"
        )

        // Tap Start Ride
        startRideButton.tap()

        // Keep the test alive while the GPS simulation runs
        sleep(120)
    }
}
