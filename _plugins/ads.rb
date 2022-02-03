class AdsInlineTag < Liquid::Tag
    def initialize(tag_name, input, tokens)
      super
    end
  
    def render(context)
      # Write the output HTML string
      output =  "<div style=\"margin: 0 auto; padding: .8em 0;\"><script async "
      output += "src=\"//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js\">"
      output += "</script><ins class=\"adsbygoogle\" style=\"display:block\" data-ad-client=\"xxxxx\""
      output += "data-ad-slot=\"yyyyyy\" data-ad-format=\"auto\"></ins><script>(adsbygoogle ="
      output += "window.adsbygoogle || []).push({});</script></div>"
  
      # Render it on the page by returning it
      return output;
    end
  end
  Liquid::Template.register_tag('ads', AdsInlineTag)
  