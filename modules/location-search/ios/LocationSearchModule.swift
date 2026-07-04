import ExpoModulesCore
import MapKit
import CoreLocation

private class SearchCompleterDelegate: NSObject, MKLocalSearchCompleterDelegate {
  // Strong reference to the completer so it stays alive while waiting for results.
  var completer: MKLocalSearchCompleter?
  var onUpdate: (([MKLocalSearchCompletion]) -> Void)?
  var onError: ((Error) -> Void)?

  // Intentional retain cycle: keeps self alive until the delegate fires.
  private var selfRetain: SearchCompleterDelegate?

  func activate() { selfRetain = self }

  private func deactivate() {
    selfRetain = nil
    completer = nil
  }

  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    onUpdate?(completer.results)
    deactivate()
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    onError?(error)
    deactivate()
  }
}

public class LocationSearchModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LocationSearch")

    // Returns autocomplete suggestions for a query string.
    // latitude/longitude bias the results toward a region when provided.
    AsyncFunction("getCompletions") { (query: String, latitude: Double?, longitude: Double?, promise: Promise) in
      guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
        promise.resolve([[String: String]]())
        return
      }

      DispatchQueue.main.async {
        let completer = MKLocalSearchCompleter()
        completer.resultTypes = [.address, .pointOfInterest]

        if let lat = latitude, let lng = longitude {
          completer.region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
            latitudinalMeters: 50_000,
            longitudinalMeters: 50_000
          )
        }

        let delegate = SearchCompleterDelegate()
        delegate.completer = completer
        completer.delegate = delegate

        delegate.onUpdate = { completions in
          let results = completions.prefix(8).map { c -> [String: String] in
            ["title": c.title, "subtitle": c.subtitle]
          }
          promise.resolve(Array(results))
        }

        delegate.onError = { error in
          promise.reject("SEARCH_ERROR", error.localizedDescription)
        }

        delegate.activate()
        completer.queryFragment = query
      }
    }

    // Resolves a suggestion (title + subtitle) to coordinates.
    // latitude/longitude bias the search region when provided.
    AsyncFunction("resolveCompletion") { (title: String, subtitle: String, latitude: Double?, longitude: Double?, promise: Promise) in
      DispatchQueue.main.async {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = subtitle.isEmpty ? title : "\(title) \(subtitle)"

        if let lat = latitude, let lng = longitude {
          request.region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
            latitudinalMeters: 50_000,
            longitudinalMeters: 50_000
          )
        }

        let search = MKLocalSearch(request: request)
        search.start { response, error in
          if let error = error {
            promise.reject("RESOLVE_ERROR", error.localizedDescription)
            return
          }
          guard let item = response?.mapItems.first else {
            promise.reject("NO_RESULTS", "No results found")
            return
          }
          promise.resolve([
            "latitude": item.placemark.coordinate.latitude,
            "longitude": item.placemark.coordinate.longitude,
            "name": item.name ?? title
          ] as [String: Any])
        }
      }
    }
  }
}
