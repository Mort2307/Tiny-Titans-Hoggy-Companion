/** Build-only raster generation of the official TinyTitans T glyph.
 * White silhouette, transparent background, 96x96 PNG for Android status bar.
 * This PNG was rasterised from the repo-owned /icons/tiny-titans-192.svg,
 * not from internet imagery or a third-party icon collection.
 */
import fs from "node:fs";
import path from "node:path";
const BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAAEJUlEQVR4nO2cTahVZRSGn3XTDAwvBNHAjITEQdTAzMHVQp00amKK9EeQ0yZZ0A/aTK2hUZBFo1uTsl+oQA0sSOpGGAii0CAbFrdIB90SeRvscyFEbe9vfz/7O2c9873We9Z719rrfHufC47jOI7jOI7jOI7jOI7jZMFyJpM0A9yXM2cETpnZ56mCZzNA0r3AN8DSXDkjssXMjqcIPJUi6OVIuhF4lzqLD3B7qsBZDAAOAmsy5YrNWeC9VMGTjyBJ24APUudJxEVgk5nNpUqQtAMkrQTeTJkjMXtSFh8SdoCkKeAosDVVjsR8DWw1s0spk6TsgOeot/h/AI+nLj4k6gBJ9wAngOtTxM/ATjNLduP9L9E7QNJympWz1uK/lav4kGYEvQqsTRA3Bz8Bz+RMGHUE+crZnWgd4CtnGFE6wFfOcGJ1gK+cgfTuAF85+9GrA3zl7E/fEeQrZ0+CR5Ck7cD7EbXk5B9gxsx+KC0kqAMk3QociqwlJ68NofgQYMBo5ZwFboovJxtHSwtYJKQDngU2R9aRm+WlBSwSYsCj0VXk54nSAhYJMeDT6Cry86CkVyQtKy0kaAuStI4094A7gN3ke4D/O3CK5iCuL3PAS12/UWd9MasNkqZp3h+6s7SWAHaY2eEuF+R6LaU1ZvYnsLe0jkAWul4wOANGDGJH78hh4LOuFw3VgJWlBXTkNPCkmanrhUM14OnSAjpwHnjIzC6EXDw4AyQ9BuworaMlAnaZ2ZnQAIPagiStBn4EVpTW0pIDZvZinwCDMUDSEuArYKa0lpZ8CTzQ90nakEbQHuop/i/AwzEeYw6iAyRtBI4DSwpLacMCcL+ZfR8jWPEOGH3znaWO4gM8Fav4MAADgNeB1aVFtOSQmb0dM2DRETRaOWdLaujAHM3o+Ttm0GIGVLZyzgPrzezn2IGLjKDRyvkOdRT/EvBIiuJDuXtATSvn82Z2JFXw7COospXzY2BbyCFbW3L/Un4aOEkdW89ZYIOZnU+ZJPcIqmXlvEDzl5+0+JDRgNHKWcMbFaI52z+dI1mWESTpFpqWns6Rrycvm9kLuZLl6oA11FH8YzQbWjZyGfAt8AlNew+Vc0Q64RxrJE1JukvSh4rHX5LWl/5sVTEy4otIBuwq/XmqRNKWCMWv+TX7ski6rWfxv1Ph90OH8DygD31u6vM0P9CLerzcldoNCCXpCWcXJtWApCecE4OkVQFz/yNJg3gZoXoCDDgjaVAPgSZpBGU74ezCpBiQ9YRzYugwgvaX1jqWtDTgmKTrSmsdS1oYcE7SzaV1XotxvgcsANvN7LfSQsaW/+kAP+FMzTUMeKO0tongKgYUP+GcGK5gwK+SVpXWNTFIukHS/Kj4FyXV+o8D60XS3ZL2SdpcWovjOI7jOI7jOI7jOI7jOI5zNf4Fs+GDxYWFZqkAAAAASUVORK5CYII=";
const bytes = Buffer.from(BASE64, "base64");
if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Notification badge PNG header invalid");
const target = path.resolve("public/tiny-titans-notification-badge.png");
fs.writeFileSync(target, bytes);
console.log("Generated original TinyTitans monochrome status-bar badge (96×96).");
