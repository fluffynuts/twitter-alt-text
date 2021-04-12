# twitter-alt-text

Web Extension to show alt-text for images inline in Twitter


## what does it do now?
- adds alt-text elements near images which have alt-text
- adds a sad message near images which do not have alt-text
- ignores overview images on the profile page (top-right)
- ignores emoji images (they already have alt-text)

## what might it do in the future?
- Provide a quick-link / button to reshare an image with no alt-text,
  opening up the relevant editor in the Twitter UI so that one could add
  alt-text. For true bonus points, it should OCR the image & pass off to
  any free AI image description service to get the user started. High and
  lofty goals indeed.
  
## TODO
- fix alts when there are two shared images
  - shared images are squished to the left and alt-texts all pile up on the right
